// Real PostgreSQL policies and functions in an isolated database. No production connection.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(
  process.env.PGLITE_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
let checks = 0;
const eq = (a, b) => {
  assert.deepEqual(a, b);
  checks++;
};
const reject = async (fn, pattern) => {
  await assert.rejects(fn, pattern);
  checks++;
};
async function root() {
  await db.exec("RESET ROLE");
}
async function actor(n, role = "authenticated") {
  await root();
  await db.query("SELECT set_config('request.jwt.claims',$1,false)", [
    JSON.stringify(n ? { sub: id(n), role } : { role }),
  ]);
  await db.exec(`SET ROLE ${role}`);
}
async function api(n, action, payload = {}) {
  await actor(n);
  return (
    await db.query("SELECT public.school_portal($1,$2::jsonb) AS result", [
      action,
      JSON.stringify(payload),
    ])
  ).rows[0].result;
}
const data = async (sql, params = []) => {
  await root();
  return db.query(sql, params);
};
try {
  await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
  CREATE SCHEMA auth;
  CREATE TABLE auth.users(id uuid PRIMARY KEY,email_confirmed_at timestamptz DEFAULT now(),raw_app_meta_data jsonb DEFAULT '{}',is_anonymous boolean DEFAULT false);
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT (auth.jwt()->>'sub')::uuid $$;
  GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
  CREATE TABLE interview_sessions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users ON DELETE CASCADE,session_reference text UNIQUE,
    interview_type text,status text DEFAULT 'active',created_at timestamptz DEFAULT now(),started_at timestamptz DEFAULT now(),ended_at timestamptz);
  CREATE TABLE feedback(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users ON DELETE CASCADE,interview_session_id text,
    session_reference text,interview_type text,created_at timestamptz DEFAULT now(),total_score numeric,personal_insight_score numeric,reasoning_score numeric,extracurricular_score numeric,current_awareness_score numeric,
    pattern_recognition_score numeric,logical_deduction_score numeric,mathematical_logic_score numeric,clarity_of_thought_score numeric,detailed_feedback jsonb,transcription text,annotations jsonb,questions_review jsonb,overall_improvement_feedback text);
  ALTER TABLE feedback ENABLE ROW LEVEL SECURITY; ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;
  GRANT SELECT ON feedback,interview_sessions TO authenticated;
  CREATE POLICY feedback_own ON feedback FOR SELECT TO authenticated USING(user_id=auth.uid());
  CREATE POLICY session_own ON interview_sessions FOR SELECT TO authenticated USING(user_id=auth.uid());
 `);
  const migration = await readFile(
    new URL(
      "../supabase/migrations/20261006000001_school_classes.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(migration);
  await db.exec(migration);
  checks++;
  const references = await readFile(
    new URL(
      "../supabase/migrations/20261006000002_school_feedback_references.sql",
      import.meta.url,
    ),
    "utf8",
  );
  await db.exec(references);
  await db.exec(references);
  checks++;
  for (const signature of [
    "school_visible_interviews(uuid,uuid)",
    "school_practice_stats(uuid,uuid)",
  ])
    for (const role of ["anon", "authenticated"])
      eq(
        (
          await db.query(
            "SELECT has_function_privilege($1,$2,'EXECUTE') AS ok",
            [role, signature],
          )
        ).rows[0].ok,
        false,
      );
  for (const role of ["anon", "authenticated"])
    eq(
      (
        await db.query(
          "SELECT has_function_privilege($1,'school_portal(text,jsonb)','EXECUTE') AS ok",
          [role],
        )
      ).rows[0].ok,
      role === "authenticated",
    );
  for (let n = 1; n <= 8; n++)
    await db.query("INSERT INTO auth.users(id) VALUES($1)", [id(n)]);
  await db.query(
    'UPDATE auth.users SET raw_app_meta_data=\'{"mmi_guest_trial":"trial"}\' WHERE id=$1',
    [id(6)],
  );
  await db.query("UPDATE auth.users SET email_confirmed_at=NULL WHERE id=$1", [
    id(7),
  ]);
  await db.query("UPDATE auth.users SET is_anonymous=true WHERE id=$1", [
    id(8),
  ]);
  await actor(null, "anon");
  await reject(
    () => db.query("SELECT school_portal('state')"),
    /permission denied/,
  );
  for (const n of [6, 7, 8]) await reject(() => api(n, "state"), /verified/);
  await reject(
    () => api(1, "create_class", { name: "Class A" }),
    /profile first/,
  );
  await reject(
    () =>
      api(1, "setup_teacher", { name: "Ms Patel", school: "Example School" }),
    /Confirm/,
  );
  await api(1, "setup_teacher", {
    name: "Ms Patel",
    school: "Example School",
    confirmed_teacher: true,
  });
  await api(2, "setup_teacher", {
    name: "Mr Green",
    school: "Another School",
    confirmed_teacher: true,
  });
  await reject(
    () => api(1, "create_class", { name: "Ok", weekly_target: 0 }),
    /target/,
  );
  const cl = await api(1, "create_class", {
    name: "Year 5 — Interview Club",
    year_group: "Year 5",
    weekly_target: 2,
  });
  const other = await api(2, "create_class", { name: "Other private class" });
  eq(cl.invite_token.length, 32);
  eq(cl.weekly_target, 2);
  eq((await api(1, "state")).classes.length, 1);
  eq((await api(3, "state")).classes, []);
  for (const action of [
    "class",
    "student",
    "feedback",
    "review",
    "update_class",
    "invite",
    "membership",
  ])
    await reject(
      () =>
        api(2, action, {
          class_id: cl.id,
          student_id: id(3),
          session_id: id(100),
          decision: "approve",
        }),
      /Class not found/,
    );
  for (const token of ["x", "0".repeat(32)])
    await reject(() => api(3, "preview_invite", { token }), /not available/);
  await reject(
    () => api(1, "preview_invite", { token: cl.invite_token }),
    /your class invitation/,
  );
  const preview = await api(3, "preview_invite", { token: cl.invite_token });
  eq(preview.teacher_name, "Ms Patel");
  eq(preview.school_name, "Example School");
  eq(preview.status, null);
  eq(Object.hasOwn(preview, "invite_token"), false);
  eq(Object.hasOwn(preview, "students"), false);
  await reject(
    () => api(3, "join_class", { token: cl.invite_token, name: "Aisha" }),
    /confirm/,
  );
  await api(3, "join_class", {
    token: cl.invite_token,
    name: "Aïsha O’Neil",
    consent: true,
  });
  await api(4, "join_class", {
    token: cl.invite_token,
    name: "Ben",
    consent: true,
  });
  eq(
    (
      await api(3, "join_class", {
        token: cl.invite_token,
        name: "Changed name",
        consent: true,
      })
    ).status,
    "pending",
  );
  eq((await api(3, "state")).memberships[0].stats.completed, 0);
  await reject(() => api(3, "class", { class_id: cl.id }), /Class not found/);
  await reject(
    () => api(1, "student", { class_id: cl.id, student_id: id(3) }),
    /not sharing/,
  );
  let classroom = await api(1, "class", { class_id: cl.id });
  eq(classroom.students.length, 2);
  eq(classroom.students[0].stats, null);
  await api(1, "membership", {
    class_id: cl.id,
    student_id: id(3),
    decision: "approve",
  });
  await api(1, "membership", {
    class_id: cl.id,
    student_id: id(4),
    decision: "approve",
  });
  await reject(
    () =>
      api(1, "membership", {
        class_id: cl.id,
        student_id: id(3),
        decision: "approve",
      }),
    /has changed/,
  );
  await data(
    "UPDATE school_memberships SET approved_at=now()-interval '2 days' WHERE class_id=$1",
    [cl.id],
  );
  const session = async (
    n,
    user,
    type,
    age,
    status = "completed",
    minutes = 10,
  ) =>
    data(
      `INSERT INTO interview_sessions(id,user_id,session_reference,interview_type,status,created_at,started_at,ended_at)
  VALUES($1,$2,$3,$4,$5,now()-($6||' hours')::interval,now()-($6||' hours')::interval,now()-($6||' hours')::interval+($7||' minutes')::interval)`,
      [id(n), id(user), "s" + n, type, status, age, minutes],
    );
  const feedback = async (n, s, user, type, score, age = 0) =>
    data(
      `INSERT INTO feedback(id,user_id,interview_session_id,session_reference,interview_type,total_score,created_at,transcription,detailed_feedback,questions_review)
  VALUES($1,$2,$3,$4,$5,$6,now()-($7||' minutes')::interval,$8,'{"overall":"QA evidence"}','[]')`,
      [id(n), id(user), id(s), "s" + s, type, score, age, `Transcript ${n}`],
    ).then(() =>
      data(
        "UPDATE feedback SET personal_insight_score=4,reasoning_score=4,extracurricular_score=4,current_awareness_score=4 WHERE id=$1",
        [id(n)],
      ),
    );
  await session(100, 3, "11-plus", 1);
  await feedback(200, 100, 3, "11-plus", 0, 20);
  await session(101, 3, "11-plus", 4);
  await feedback(201, 101, 3, "11-plus", null, 10);
  await session(102, 3, "logic-puzzles", 6);
  await feedback(202, 102, 3, "logic-puzzles", 18, 10);
  await session(103, 3, "11-plus", 72);
  await feedback(203, 103, 3, "11-plus", 20, 10); // private before joining
  await session(104, 3, "medicine-mmi", 1);
  await feedback(204, 104, 3, "medicine-mmi", 20, 10);
  await session(105, 3, "11-plus", 1, "abandoned");
  await session(106, 4, "11-plus", 1);
  await feedback(206, 106, 4, "11-plus", 12, 10);
  await session(107, 5, "11-plus", 1);
  await feedback(207, 107, 5, "11-plus", 20, 10);
  let pupil = await api(1, "student", { class_id: cl.id, student_id: id(3) });
  eq(pupil.interviews.length, 4);
  eq(pupil.stats.completed, 3);
  eq(pupil.stats.average_score, 0);
  eq(pupil.stats.scored, 1);
  eq(pupil.stats.unreviewed, 3);
  eq(pupil.stats.minutes, 30);
  eq(
    pupil.interviews.some((i) =>
      [id(103), id(104), id(106), id(107)].includes(i.id),
    ),
    false,
  );
  const expectedWeek = (
    await data(
      "SELECT count(*)::integer AS n FROM interview_sessions WHERE id=ANY($1::uuid[]) AND started_at>=date_trunc('week',now() AT TIME ZONE 'Europe/London') AT TIME ZONE 'Europe/London'",
      [[id(100), id(101), id(102)]],
    )
  ).rows[0].n;
  eq(pupil.stats.this_week, expectedWeek);
  await feedback(208, 100, 3, "11-plus", 16, 1);
  pupil = await api(1, "student", { class_id: cl.id, student_id: id(3) });
  eq(pupil.stats.completed, 3);
  eq(pupil.stats.average_score, 16);
  eq(pupil.stats.scored, 1);
  eq(pupil.interviews.find((i) => i.id === id(100)).feedback_id, id(208));
  let detail = await api(1, "feedback", {
    class_id: cl.id,
    student_id: id(3),
    session_id: id(100),
  });
  eq(detail.feedback.transcription, "Transcript 208");
  eq(Object.hasOwn(detail.feedback, "user_id"), false);
  for (const [sessionId, reference] of [
    ["s100", "s100"],
    ["s100", null],
    [id(100), null],
    ["legacy-anam-id", "s100"],
  ]) {
    await data(
      "UPDATE feedback SET interview_session_id=$2,session_reference=$3 WHERE id=$1",
      [id(208), sessionId, reference],
    );
    eq(
      (
        await api(1, "feedback", {
          class_id: cl.id,
          student_id: id(3),
          session_id: id(100),
        })
      ).feedback.id,
      id(208),
    );
  }
  await data("UPDATE feedback SET current_awareness_score=NULL WHERE id=$1", [
    id(208),
  ]);
  eq(
    (await api(1, "student", { class_id: cl.id, student_id: id(3) })).stats
      .average_score,
    null,
  );
  await data("UPDATE feedback SET current_awareness_score=4 WHERE id=$1", [
    id(208),
  ]);
  for (const sid of [103, 104, 106, 107])
    await reject(
      () =>
        api(1, "feedback", {
          class_id: cl.id,
          student_id: id(3),
          session_id: id(sid),
        }),
      /not available/,
    );
  await reject(
    () =>
      api(1, "review", {
        class_id: cl.id,
        student_id: id(3),
        session_id: id(105),
        note: "Try again",
      }),
    /Wait until/,
  );
  await reject(
    () =>
      api(2, "review", {
        class_id: cl.id,
        student_id: id(3),
        session_id: id(100),
        note: "NO",
      }),
    /Class not found/,
  );
  const review = await api(1, "review", {
    class_id: cl.id,
    student_id: id(3),
    session_id: id(100),
    note: "Explain what you changed after listening.",
    expected_version: 0,
  });
  eq(review.version, 1);
  eq(
    (await api(1, "student", { class_id: cl.id, student_id: id(3) })).stats
      .unreviewed,
    2,
  );
  await reject(
    () =>
      api(1, "review", {
        class_id: cl.id,
        student_id: id(3),
        session_id: id(100),
        note: "Stale overwrite",
        expected_version: 0,
      }),
    /another tab/,
  );
  const studentState = await api(3, "state");
  eq(studentState.memberships.length, 1);
  eq(
    studentState.memberships[0].teacher_notes[0].note,
    "Explain what you changed after listening.",
  );
  eq(JSON.stringify(studentState).includes("Ben"), false);
  eq(JSON.stringify(studentState).includes("Transcript"), false);
  eq(JSON.stringify(studentState).includes(cl.invite_token), false);
  await actor(1);
  eq((await db.query("SELECT * FROM feedback")).rows.length, 0);
  eq((await db.query("SELECT * FROM interview_sessions")).rows.length, 0);
  for (const table of [
    "school_classes",
    "school_teachers",
    "school_memberships",
    "school_interview_reviews",
  ])
    await reject(() => db.query(`SELECT * FROM ${table}`), /permission denied/);
  await reject(
    () => db.query("SELECT * FROM school_visible_interviews($1)", [cl.id]),
    /permission denied/,
  );
  await actor(3);
  eq(
    (await db.query("SELECT count(*)::integer AS n FROM feedback")).rows[0].n,
    6,
  ); // own normal feedback remains available
  const rotated = await api(1, "invite", {
    class_id: cl.id,
    decision: "rotate",
  });
  eq(rotated.invite_token !== cl.invite_token, true);
  await reject(
    () => api(5, "preview_invite", { token: cl.invite_token }),
    /not available/,
  );
  await api(1, "invite", { class_id: cl.id, decision: "close" });
  await reject(
    () =>
      api(5, "join_class", {
        token: rotated.invite_token,
        name: "Eli",
        consent: true,
      }),
    /not available/,
  );
  const newLink = await api(1, "invite", {
    class_id: cl.id,
    decision: "rotate",
  });
  await api(5, "join_class", {
    token: newLink.invite_token,
    name: "Eli",
    consent: true,
  });
  await api(1, "membership", {
    class_id: cl.id,
    student_id: id(5),
    decision: "decline",
  });
  await reject(
    () =>
      api(5, "join_class", {
        token: newLink.invite_token,
        name: "Eli",
        consent: true,
      }),
    /Contact your teacher/,
  );
  await api(1, "membership", {
    class_id: cl.id,
    student_id: id(5),
    decision: "allow_rejoin",
  });
  await reject(
    () => api(1, "student", { class_id: cl.id, student_id: id(5) }),
    /not sharing/,
  );
  await api(5, "join_class", {
    token: newLink.invite_token,
    name: "Eli",
    consent: true,
  });
  eq((await api(5, "state")).memberships[0].status, "pending");
  await api(1, "membership", {
    class_id: cl.id,
    student_id: id(5),
    decision: "approve",
  });
  eq(
    (await api(1, "student", { class_id: cl.id, student_id: id(5) })).stats
      .completed,
    0,
  );
  await api(4, "leave_class", { class_id: cl.id });
  await reject(
    () =>
      api(1, "feedback", {
        class_id: cl.id,
        student_id: id(4),
        session_id: id(106),
      }),
    /not sharing/,
  );
  await api(4, "join_class", {
    token: newLink.invite_token,
    name: "Ben returns",
    consent: true,
  });
  await api(1, "membership", {
    class_id: cl.id,
    student_id: id(4),
    decision: "approve",
  });
  eq(
    (await api(1, "student", { class_id: cl.id, student_id: id(4) })).stats
      .completed,
    0,
  );
  await api(1, "membership", {
    class_id: cl.id,
    student_id: id(3),
    decision: "remove",
  });
  await reject(
    () => api(1, "student", { class_id: cl.id, student_id: id(3) }),
    /not sharing/,
  );
  eq((await api(3, "state")).memberships[0].teacher_notes, []);
  await reject(
    () =>
      api(3, "join_class", {
        token: newLink.invite_token,
        name: "Aisha",
        consent: true,
      }),
    /Contact your teacher/,
  );
  await api(1, "update_class", {
    class_id: cl.id,
    name: "Renamed class",
    year_group: "Year 6",
    weekly_target: 3,
  });
  eq((await api(1, "class", { class_id: cl.id })).class.weekly_target, 3);
  await api(1, "update_class", { class_id: cl.id, archive: true });
  eq((await api(1, "state")).classes[0].archived_at !== null, true);
  await reject(
    () => api(1, "invite", { class_id: cl.id, decision: "rotate" }),
    /read-only/,
  );
  await reject(
    () => api(5, "preview_invite", { token: newLink.invite_token }),
    /not available/,
  );
  await data(
    "UPDATE school_classes SET invite_expires_at=now()-interval '1 minute' WHERE id=$1",
    [other.id],
  );
  await reject(
    () => api(3, "preview_invite", { token: other.invite_token }),
    /not available/,
  );
  await reject(() => api(1, "delete_everything", {}), /Unknown/);
  // The original RLS policies still exist; this feature must not broaden personal-table access.
  eq(
    (
      await data(
        "SELECT count(*)::integer AS n FROM pg_policies WHERE policyname IN ('feedback_own','session_own')",
      )
    ).rows[0].n,
    2,
  );
  const paged = await api(2,'create_class',{name:'Pagination class'});
  await api(3,'join_class',{token:paged.invite_token,name:'Aisha',consent:true});
  await api(2,'membership',{class_id:paged.id,student_id:id(3),decision:'approve'});
  await data("UPDATE school_memberships SET approved_at=now()-interval '2 days' WHERE class_id=$1",[paged.id]);
  for(let i=300;i<321;i++)await session(i,3,'11-plus',1);
  const firstPage=await api(2,'student',{class_id:paged.id,student_id:id(3),page:1});
  const secondPage=await api(2,'student',{class_id:paged.id,student_id:id(3),page:2});
  // Include this pupil's earlier same-day school practice, but never their Medicine or older private session.
  eq(firstPage.interviews.length,20);eq(secondPage.interviews.length,5);eq(firstPage.total,25);
  eq(firstPage.interviews.some(a=>secondPage.interviews.some(b=>a.id===b.id)),false);
  await reject(()=>api(2,'student',{class_id:paged.id,student_id:id(3),page:0}),/Invalid page/);
  await data("UPDATE interview_sessions SET ended_at=now()+interval '10 minutes' WHERE id=$1",[id(320)]);
  await api(2,'update_class',{class_id:paged.id,archive:true});
  eq((await api(2,'student',{class_id:paged.id,student_id:id(3)})).total,24);
  await reject(()=>api(2,'membership',{class_id:paged.id,student_id:id(3),decision:'allow_rejoin'}),/read-only/);
  for(let i=0;i<24;i++)await api(2,'create_class',{name:`Capacity class ${i}`});
  await reject(()=>api(2,'create_class',{name:'One too many'}),/25 active classes/);
  // A full roster cannot grow through either a new invitation or a repeated join.
  const full=await api(2,'invite',{class_id:other.id,decision:'rotate'});
  for(let i=1000;i<1200;i++){
    await data('INSERT INTO auth.users(id) VALUES($1)',[id(i)]);
    await data('INSERT INTO school_memberships(class_id,student_id,display_name) VALUES($1,$2,$3)',[other.id,id(i),`Pupil ${i}`]);
  }
  await reject(()=>api(4,'join_class',{token:full.invite_token,name:'Ben',consent:true}),/class is full/);
  console.log(`${checks} school classroom SQL checks passed.`);
} finally {
  await db.close();
}
