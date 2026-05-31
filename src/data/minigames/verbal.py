"""Original 11+ Verbal Reasoning question bank. Standard difficulty (age 10-11)."""
Q = []

def add(topic, question, options, answer, explanation):
    assert answer in options, f"answer not in options: {question}"
    Q.append({
        "subject": "Verbal reasoning", "topic": topic, "difficulty": "Standard",
        "question": question, "options": list(options),
        "answer": answer, "explanation": explanation,
    })

# ---- Synonyms ----
add("Synonyms","Choose the word most similar in meaning to RAPID.",
    ["Swift","Heavy","Quiet","Narrow"],"Swift","Rapid and swift both mean fast.")
add("Synonyms","Choose the word most similar in meaning to BRAVE.",
    ["Courageous","Foolish","Gentle","Honest"],"Courageous","Brave and courageous both mean showing courage.")
add("Synonyms","Choose the word most similar in meaning to ENORMOUS.",
    ["Huge","Tiny","Rough","Empty"],"Huge","Enormous and huge both mean very large.")
add("Synonyms","Choose the word most similar in meaning to BEGIN.",
    ["Commence","Finish","Delay","Repeat"],"Commence","Begin and commence both mean to start.")
add("Synonyms","Choose the word most similar in meaning to ANGRY.",
    ["Furious","Cheerful","Weary","Curious"],"Furious","Angry and furious both describe being cross.")

# ---- Antonyms ----
add("Antonyms","Choose the word most OPPOSITE in meaning to ANCIENT.",
    ["Modern","Old","Fragile","Heavy"],"Modern","Ancient means very old; its opposite is modern.")
add("Antonyms","Choose the word most OPPOSITE in meaning to EXPAND.",
    ["Shrink","Grow","Stretch","Build"],"Shrink","Expand means to get bigger; shrink means to get smaller.")
add("Antonyms","Choose the word most OPPOSITE in meaning to GENEROUS.",
    ["Mean","Kind","Wealthy","Polite"],"Mean","Generous means giving freely; mean is its opposite.")
add("Antonyms","Choose the word most OPPOSITE in meaning to ARRIVE.",
    ["Depart","Reach","Enter","Return"],"Depart","Arrive means to reach a place; depart means to leave.")
add("Antonyms","Choose the word most OPPOSITE in meaning to VICTORY.",
    ["Defeat","Triumph","Battle","Prize"],"Defeat","Victory is a win; defeat is a loss.")

# ---- Odd one out ----
add("Odd one out","Which word is the odd one out? rose, tulip, oak, daisy",
    ["oak","rose","tulip","daisy"],"oak","Rose, tulip and daisy are flowers; an oak is a tree.")
add("Odd one out","Which word is the odd one out? violin, trumpet, guitar, harp",
    ["trumpet","violin","guitar","harp"],"trumpet","The others are string instruments; a trumpet is brass.")
add("Odd one out","Which word is the odd one out? copper, gold, silver, plastic",
    ["plastic","copper","gold","silver"],"plastic","Copper, gold and silver are metals; plastic is not.")
add("Odd one out","Which word is the odd one out? square, circle, triangle, cube",
    ["cube","square","circle","triangle"],"cube","The others are 2D shapes; a cube is 3D.")

# ---- Analogies ----
add("Analogies","Cat is to kitten as dog is to ____.",
    ["puppy","bone","bark","kennel"],"puppy","A young cat is a kitten; a young dog is a puppy.")
add("Analogies","Finger is to hand as toe is to ____.",
    ["foot","leg","shoe","arm"],"foot","Fingers are part of a hand; toes are part of a foot.")
add("Analogies","Author is to book as composer is to ____.",
    ["symphony","piano","stage","concert"],"symphony","An author creates a book; a composer creates a symphony (music).")
add("Analogies","Hot is to cold as up is to ____.",
    ["down","high","top","over"],"down","Hot and cold are opposites; the opposite of up is down.")
add("Analogies","Library is to books as garage is to ____.",
    ["cars","tools","petrol","roads"],"cars","A library stores books; a garage stores cars.")

# ---- Hidden words ----
add("Hidden word","A four-letter word is hidden at the end of one word and the start of the next. Find it: 'She kept her CALM, ENDING the argument quietly.'",
    ["MEND","CALM","ENDS","LAME"],"MEND","calM ENDing -> the letters 'mend' bridge the two words.")
add("Hidden word","A four-letter animal is hidden across the word boundary. Find it: 'The clever fox entered the barn.'",
    ["OXEN","FOXE","XENT","OXET"],"OXEN","Take the end of 'fox' and the start of 'entered': fOX ENtered -> OXEN.")
add("Hidden word","Which word hides the colour RED (the letters r-e-d in a row)?",
    ["CREDIT","BREAD","GUARD","BORED"],"CREDIT","CREDIT contains the consecutive letters c-RED-it.")

# ---- Letter sequences / codes ----
add("Letter sequence","What comes next in the series: B, D, F, H, ?",
    ["J","I","K","G"],"J","The letters skip one each time (B,D,F,H), so the next is J.")
add("Letter sequence","What comes next: Z, X, V, T, ?",
    ["R","S","U","Q"],"R","Each letter moves back two places in the alphabet; after T comes R.")
add("Letter sequence","What comes next: A, C, F, J, ?",
    ["O","N","M","P"],"O","The gaps increase: +2, +3, +4, then +5, so J + 5 = O.")
add("Codes","If CAT is coded as DBU, how is DOG coded?",
    ["EPH","CPF","EOH","DPG"],"EPH","Each letter moves forward one place: D->E, O->P, G->H.")
add("Codes","If the code for MOON is 13-15-15-14 (letter positions), what is the code for ZOO?",
    ["26-15-15","25-15-15","26-14-14","24-15-15"],"26-15-15","Z is the 26th letter, O is the 15th, O is the 15th.")
add("Codes","In a code, FISH = GJTI (each letter +1). What does the code WPSME stand for?",
    ["VORLD","VOTLD","WORLD","VORLE"],"VORLD","Reverse the rule by moving each letter back one: W->V, P->O, S->R, M->L, E->D -> VORLD.")

# ---- Word relationships / compound ----
add("Compound words","Which word goes with BUTTER to make a new word?",
    ["fly","jam","milk","bread"],"fly","BUTTER + FLY = butterfly.")
add("Compound words","Which word can follow SNOW to make a new word?",
    ["man","rain","sun","tree"],"man","SNOW + MAN = snowman.")
add("Word link","Which word fits both: a piece of furniture AND a meeting of people. ____",
    ["board","chair","table","bench"],"board","A board is a flat surface (e.g. a notice board) and a board can also mean a group of people who meet, e.g. a board meeting.")
add("Word link","Which word means both a part of a tree AND something a bank can have? ____",
    ["branch","root","trunk","leaf"],"branch","A branch is part of a tree and also a local office of a bank.")

# ---- Number/word logic ----
add("Logic","Tom is taller than Sam. Sam is taller than Raj. Who is the shortest?",
    ["Raj","Tom","Sam","Cannot tell"],"Raj","Order from tallest: Tom, Sam, Raj, so Raj is shortest.")
add("Logic","If all bloops are red, and some red things are round, which must be true?",
    ["All bloops are red","All red things are bloops","All bloops are round","Some bloops are blue"],
    "All bloops are red","Only the first statement is guaranteed by the information given.")
add("Logic","Five children sit in a row. Mia is in the middle. Leo is on her left. Who could be at the far right end?",
    ["A child other than Mia or Leo","Mia","Leo","No one"],
    "A child other than Mia or Leo","Mia is central and Leo is to her left, so the right end must be one of the other children.")
add("Days/time logic","If today is Wednesday, what day will it be in 10 days' time?",
    ["Saturday","Friday","Sunday","Monday"],"Saturday","10 days = 1 week (7) + 3 days; 3 days after Wednesday is Saturday.")

# ---- Spelling/missing letters ----
add("Missing letters","Complete the word: NEC___ARY (meaning needed).",
    ["ESS","ASS","ISS","OSS"],"ESS","The word is NECESSARY.")
add("Missing letters","Which letter completes both words: _OUND (to make 'round') and _IND (to make 'wind')? Choose the pair.",
    ["R and W","S and K","G and F","B and M"],"R and W","ROUND uses R; WIND uses W.")
add("Anagrams","Which word can be made using all the letters of 'LEMON'?",
    ["MELON","MONKEY","MEDAL","LIMES"],"MELON","LEMON rearranges to MELON, another fruit, using the same five letters.")
add("Anagrams","Which of these is an anagram of 'LISTEN'?",
    ["SILENT","TINSELS","LITNES","STOLEN"],"SILENT","LISTEN and SILENT use exactly the same six letters.")

# ---- Sorting / categories ----
add("Categories","'Mammal' is to 'whale' as 'reptile' is to ____.",
    ["crocodile","shark","frog","penguin"],"crocodile","A whale is a mammal; a crocodile is a reptile.")
add("Categories","Which word belongs in the same group as APPLE, BANANA, CHERRY?",
    ["grape","carrot","potato","onion"],"grape","All are fruits; a grape is also a fruit, the others are vegetables.")
add("Sequences (words)","Put in order of size, smallest first, then choose the largest: ant, dog, mouse, elephant.",
    ["elephant","ant","mouse","dog"],"elephant","Of the four, the elephant is the largest animal.")

# ---- More synonyms/antonyms to reach ~50 ----
add("Synonyms","Choose the word most similar in meaning to PURCHASE.",
    ["Buy","Sell","Borrow","Lose"],"Buy","To purchase something means to buy it.")
add("Synonyms","Choose the word most similar in meaning to REPLY.",
    ["Respond","Ignore","Question","Listen"],"Respond","To reply is to respond to something.")
add("Antonyms","Choose the word most OPPOSITE in meaning to TEMPORARY.",
    ["Permanent","Brief","Quick","Hourly"],"Permanent","Temporary means short-lived; permanent means lasting.")
add("Antonyms","Choose the word most OPPOSITE in meaning to INCREASE.",
    ["Decrease","Rise","Add","Double"],"Decrease","Increase means to grow; decrease means to get smaller.")
add("Odd one out","Which word is the odd one out? happy, joyful, cheerful, gloomy",
    ["gloomy","happy","joyful","cheerful"],"gloomy","The others mean glad; gloomy means sad.")
add("Analogies","Bird is to nest as bee is to ____.",
    ["hive","honey","flower","sting"],"hive","A bird lives in a nest; a bee lives in a hive.")

if __name__ == "__main__":
    import json, sys
    json.dump(Q, sys.stdout, ensure_ascii=False)
