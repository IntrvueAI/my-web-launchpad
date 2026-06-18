"""Original 11+ English Comprehension bank. Passages are original. Standard difficulty."""
Q = []

def add(passage_id, passage_title, passage_text, qtype, question, options, answer, explanation):
    assert answer in options, f"answer not in options: {question}"
    Q.append({
        "subject": "English comprehension", "topic": qtype, "difficulty": "Standard",
        "passage_id": passage_id, "passage_title": passage_title, "passage": passage_text,
        "question": question, "options": list(options),
        "answer": answer, "explanation": explanation,
    })

# ===================== PASSAGE 1: Fiction =====================
P1_T = "The Lighthouse Keeper's Daughter"
P1 = (
    "Every evening, just as the sun melted into the sea, Maris climbed the one hundred and twelve steps "
    "to the top of the lighthouse. Her father had climbed them for thirty years, but his knees had grown "
    "stiff, and now the task fell to her. She did not mind. From the lantern room she could see the whole "
    "curve of the coast, the village lights blinking awake one by one, and the dark water stretching out "
    "towards places she had only read about.\n\n"
    "Tonight a storm was gathering. The clouds pressed low and heavy, and the wind rattled the glass as if "
    "it wanted to be let in. Maris lit the great lamp and watched its beam sweep across the waves. Somewhere "
    "out there, she knew, a fishing boat might be searching for that very light. The thought made her sit a "
    "little straighter. She was only twelve, but tonight the safety of strangers rested in her careful hands."
)
add("P1", P1_T, P1, "Retrieval", "How many steps did Maris climb each evening?",
    ["One hundred and twelve","One hundred and twenty","Thirty","Twelve"],
    "One hundred and twelve","The passage states she 'climbed the one hundred and twelve steps'.")
add("P1", P1_T, P1, "Inference", "Why has the task of climbing the lighthouse passed to Maris?",
    ["Her father's knees have grown stiff","She enjoys the exercise","Her father has moved away","She was told to as a punishment"],
    "Her father's knees have grown stiff","The text says her father climbed them for thirty years 'but his knees had grown stiff'.")
add("P1", P1_T, P1, "Vocabulary", "In the passage, the word 'gathering' (a storm was gathering) most nearly means:",
    ["building up","collecting flowers","meeting friends","disappearing"],
    "building up","Here 'gathering' describes a storm growing and building up in strength.")
add("P1", P1_T, P1, "Language", "The phrase 'the wind rattled the glass as if it wanted to be let in' is an example of:",
    ["personification","a simile of size","onomatopoeia","alliteration"],
    "personification","The wind is given a human-like desire ('wanted to be let in'), which is personification.")
add("P1", P1_T, P1, "Inference", "Why does Maris 'sit a little straighter'?",
    ["She feels the responsibility of keeping sailors safe","She is cold","Her father is watching her","She is about to fall asleep"],
    "She feels the responsibility of keeping sailors safe","She realises a boat may depend on her light, so she takes the duty seriously.")
add("P1", P1_T, P1, "Retrieval", "What does Maris see from the lantern room?",
    ["The curve of the coast and the village lights","A passing train","Her school","The lighthouse keeper of the next town"],
    "The curve of the coast and the village lights","She can see 'the whole curve of the coast' and 'the village lights blinking awake'.")
add("P1", P1_T, P1, "Tone", "Which word best describes Maris's attitude to her duty?",
    ["responsible","careless","frightened","bored"],
    "responsible","She does not mind the climb and takes the safety of strangers seriously, showing she is responsible.")
add("P1", P1_T, P1, "Vocabulary", "What is the meaning of 'melted into the sea' as used about the sun?",
    ["sank slowly out of sight","became liquid","grew hotter","turned green"],
    "sank slowly out of sight","It is a descriptive way of saying the sun set, sinking gently below the horizon.")

# ===================== PASSAGE 2: Non-fiction (science) =====================
P2_T = "The Journey of a Raindrop"
P2 = (
    "Water never truly disappears; it simply moves around our planet in a never-ending cycle. When the sun "
    "heats the surface of oceans, lakes and rivers, tiny droplets of water rise into the air as an invisible "
    "gas called water vapour. This process is known as evaporation. As the vapour climbs higher, the air "
    "around it becomes cooler, and the vapour turns back into tiny droplets that cluster together to form "
    "clouds. We call this condensation.\n\n"
    "Eventually the droplets in a cloud grow heavy enough to fall as rain, snow or hail. This falling water "
    "is called precipitation. Some of it soaks into the ground, some is drunk by plants, and some flows along "
    "rivers back to the sea, where the journey begins all over again. Scientists believe the water you drank "
    "this morning may once have fallen as rain on a forest thousands of years ago."
)
add("P2", P2_T, P2, "Vocabulary", "What is the scientific name for water turning into an invisible gas?",
    ["evaporation","condensation","precipitation","irrigation"],
    "evaporation","The passage states this process 'is known as evaporation'.")
add("P2", P2_T, P2, "Retrieval", "What causes water vapour to turn back into droplets?",
    ["The air becoming cooler","The sun growing hotter","Plants drinking it","Strong winds"],
    "The air becoming cooler","'As the vapour climbs higher, the air around it becomes cooler' and it condenses.")
add("P2", P2_T, P2, "Retrieval", "Which of these is NOT given as a form of precipitation?",
    ["Fog","Rain","Snow","Hail"],
    "Fog","The passage lists rain, snow and hail as precipitation, but not fog.")
add("P2", P2_T, P2, "Inference", "What is the main idea of the passage?",
    ["Water moves around the planet in a repeating cycle","Rain is dangerous","Oceans are getting smaller","Plants need very little water"],
    "Water moves around the planet in a repeating cycle","The whole passage describes the never-ending water cycle.")
add("P2", P2_T, P2, "Inference", "The final sentence is included mainly to:",
    ["show that water is reused over and over","prove rain is very old","warn readers not to drink water","explain how forests grow"],
    "show that water is reused over and over","It illustrates that the same water keeps cycling, even across thousands of years.")
add("P2", P2_T, P2, "Vocabulary", "In this passage, 'cluster together' means the droplets:",
    ["group closely together","push apart","freeze solid","fall quickly"],
    "group closely together","To cluster is to gather closely in a group.")
add("P2", P2_T, P2, "Retrieval", "Where does some of the fallen water eventually flow back to?",
    ["The sea","The clouds directly","Underground caves only","The sun"],
    "The sea","'some flows along rivers back to the sea, where the journey begins all over again'.")
add("P2", P2_T, P2, "Structure", "What does the word 'Eventually' (start of paragraph two) tell the reader?",
    ["that some time passes before the next step","that the cycle has stopped","that the event is unlikely","that it happens instantly"],
    "that some time passes before the next step","'Eventually' signals that the next stage happens after a period of time.")

# ===================== PASSAGE 3: Fiction (adventure) =====================
P3_T = "The Map in the Attic"
P3 = (
    "Dust hung in the slanting light as Theo lifted the lid of the old trunk. Inside, beneath a moth-eaten "
    "blanket, lay a roll of yellowed paper tied with faded ribbon. His fingers trembled as he untied it. The "
    "paper crackled open to reveal a map, hand-drawn in fading ink, showing the very woods behind his "
    "grandmother's house. A dotted line wound between landmarks he half-recognised, ending at a small, "
    "neatly inked cross.\n\n"
    "'Grandma,' he called down the ladder, 'whose map is this?' But the house was quiet. He remembered then "
    "that she had gone to fetch milk from the village and would not return for an hour. An hour, Theo "
    "thought, was more than enough time. He slipped the map into his pocket, took the torch from the kitchen "
    "drawer, and stepped out into the green hush of the trees, his heart drumming with the promise of "
    "adventure."
)
add("P3", P3_T, P3, "Retrieval", "Where did Theo find the map?",
    ["Inside an old trunk in the attic","In the kitchen drawer","In the woods","In his pocket"],
    "Inside an old trunk in the attic","He lifts the lid of the trunk and finds the rolled paper inside.")
add("P3", P3_T, P3, "Inference", "Why does Theo decide he has enough time to explore?",
    ["His grandmother will be away for an hour","It is the school holidays","The map says he must hurry","His torch will only last an hour"],
    "His grandmother will be away for an hour","He remembers she has gone for milk and 'would not return for an hour'.")
add("P3", P3_T, P3, "Vocabulary", "The phrase 'the green hush of the trees' suggests the woods are:",
    ["quiet and leafy","noisy and crowded","dark and frightening","wet and muddy"],
    "quiet and leafy","'Green' suggests leaves and 'hush' suggests quietness, so the woods are quiet and leafy.")
add("P3", P3_T, P3, "Inference", "What does 'his heart drumming' tell us about how Theo feels?",
    ["He is excited","He is sleepy","He is angry","He is unwell"],
    "He is excited","A drumming heart, with the 'promise of adventure', shows excitement.")
add("P3", P3_T, P3, "Vocabulary", "'Yellowed paper' suggests the map is:",
    ["old","brightly coloured","torn in half","newly printed"],
    "old","Paper turns yellow with age, so this tells us the map is old.")
add("P3", P3_T, P3, "Retrieval", "What did Theo take from the kitchen drawer?",
    ["A torch","The map","A blanket","Some milk"],
    "A torch","'took the torch from the kitchen drawer'.")
add("P3", P3_T, P3, "Inference", "Why might the author end the passage on the word 'adventure'?",
    ["To make the reader want to know what happens next","To explain the rules of the woods","To describe the weather","To list the characters"],
    "To make the reader want to know what happens next","Ending on 'adventure' creates suspense and curiosity about what Theo will find.")
add("P3", P3_T, P3, "Language", "'The paper crackled open' uses a word that imitates a sound. This technique is called:",
    ["onomatopoeia","simile","metaphor","rhyme"],
    "onomatopoeia","'Crackled' imitates the sound it describes, which is onomatopoeia.")

# ===================== PASSAGE 4: Non-fiction (history/biography) =====================
P4_T = "The Woman Who Mapped the Stars"
P4 = (
    "In the late 1800s, a young woman named Williamina Fleming arrived in the United States with little money "
    "and no plans to become a scientist. She found work as a housekeeper for a professor of astronomy. One "
    "day, frustrated with the slow progress of his assistants, the professor declared that even his maid "
    "could do a better job. To everyone's surprise, he was right.\n\n"
    "Fleming was given the task of studying photographs of the night sky and recording the brightness of the "
    "stars. She proved so skilful that she was soon placed in charge of a team of women who carefully "
    "catalogued tens of thousands of stars. Over her career she discovered hundreds of new objects in space. "
    "Fleming showed that talent can be found in the most unexpected places, and that a chance remark can "
    "change the whole course of a life."
)
add("P4", P4_T, P4, "Retrieval", "What was Williamina Fleming's first job for the professor?",
    ["Housekeeper","Astronomer","Teacher","Photographer"],
    "Housekeeper","She 'found work as a housekeeper for a professor of astronomy'.")
add("P4", P4_T, P4, "Inference", "Why did the professor give Fleming scientific work?",
    ["He believed she could do better than his assistants","She had a science degree","She asked him many times","She owned a telescope"],
    "He believed she could do better than his assistants","He said even his maid could do a better job, then proved 'he was right'.")
add("P4", P4_T, P4, "Vocabulary", "In this passage, 'catalogued' means the stars were:",
    ["recorded and organised in a list","painted","destroyed","named after people"],
    "recorded and organised in a list","To catalogue is to record items carefully in an organised list.")
add("P4", P4_T, P4, "Inference", "What is the main message of the final sentence?",
    ["Talent can appear in unexpected places","Astronomy is very difficult","Maids make the best scientists","Photographs are unreliable"],
    "Talent can appear in unexpected places","The closing line states talent 'can be found in the most unexpected places'.")
add("P4", P4_T, P4, "Retrieval", "What did Fleming end up leading?",
    ["A team of women cataloguing stars","A photography shop","An astronomy school","A space mission"],
    "A team of women cataloguing stars","She 'was soon placed in charge of a team of women who carefully catalogued tens of thousands of stars'.")
add("P4", P4_T, P4, "Vocabulary", "A 'chance remark' is a comment that is:",
    ["made without much thought or planning","carefully rehearsed","written in a book","shouted angrily"],
    "made without much thought or planning","'Chance' here means unplanned, so a chance remark is a casual, unplanned comment.")
add("P4", P4_T, P4, "Tone", "How does the writer seem to feel about Fleming?",
    ["admiring","disappointed","amused","uninterested"],
    "admiring","The writer praises her skill and achievements, showing admiration.")

# ===================== PASSAGE 5: Poetry =====================
P5_T = "The Old Oak (a poem)"
P5 = (
    "I have stood here a hundred years,\n"
    "Through summer suns and winter's tears.\n"
    "The children climbed my crooked arms,\n"
    "And sheltered from the noonday's charms.\n\n"
    "Now grey and bent, I watch them go,\n"
    "Their children's children come and grow.\n"
    "Though storms may strip me leaf and limb,\n"
    "My roots hold fast; I will not bend."
)
add("P5", P5_T, P5, "Inference", "Who or what is the 'I' speaking in the poem?",
    ["An oak tree","A child","The wind","A lighthouse"],
    "An oak tree","The title and the references to roots, leaves and limbs show the speaker is the oak tree.")
add("P5", P5_T, P5, "Language", "Letting the tree speak as 'I' is an example of:",
    ["personification","a simile","a question","a list"],
    "personification","Giving the tree a human voice and feelings is personification.")
add("P5", P5_T, P5, "Vocabulary", "'Winter's tears' most likely refers to:",
    ["rain or melting ice","real crying","falling snowflakes counted one by one","cold winds"],
    "rain or melting ice","'Tears' is a poetic image for the water (rain or melting ice) of winter.")
add("P5", P5_T, P5, "Inference", "What does the line 'My roots hold fast; I will not bend' suggest about the tree?",
    ["It is strong and determined to survive","It is about to fall","It wants to move away","It is afraid of children"],
    "It is strong and determined to survive","Holding fast and refusing to bend shows strength and determination.")
add("P5", P5_T, P5, "Structure", "How much time does the poem suggest has passed?",
    ["About a hundred years, across several generations","A single day","One winter","Ten minutes"],
    "About a hundred years, across several generations","The tree has 'stood here a hundred years' and watches 'children's children' grow.")
add("P5", P5_T, P5, "Language", "Which pair of words at the ends of lines rhyme?",
    ["years / tears","arms / go","grow / limb","bend / strip"],
    "years / tears","'Years' and 'tears' rhyme at the ends of the first two lines.")
add("P5", P5_T, P5, "Tone", "The overall mood of the poem is best described as:",
    ["reflective and proud","silly and playful","angry and bitter","frightened"],
    "reflective and proud","The tree looks back over time with calm pride in its endurance.")

# ===================== PASSAGE 6: Non-fiction (persuasive) =====================
P6_T = "Why We Should Protect Bees"
P6 = (
    "It is easy to dismiss bees as nothing more than buzzing nuisances at a summer picnic. Yet these small "
    "insects are among the most important creatures on Earth. As bees travel from flower to flower in search "
    "of nectar, they carry pollen with them. This pollen allows plants to make seeds and fruit. Without bees, "
    "many of the foods we love, from apples to almonds, would become rare and expensive.\n\n"
    "Sadly, bee numbers are falling. The reasons include the loss of wild flowers, the use of harmful "
    "chemicals, and changes in our climate. The good news is that we can all help. By planting flowers, "
    "avoiding chemical sprays, and leaving a corner of the garden to grow wild, even children can make a real "
    "difference. Protecting bees is not just about saving insects; it is about protecting our own future too."
)
add("P6", P6_T, P6, "Inference", "What is the writer's main purpose in this passage?",
    ["To persuade readers to help protect bees","To explain how to make honey","To describe a picnic","To compare bees and wasps"],
    "To persuade readers to help protect bees","The passage argues for the importance of bees and urges readers to act.")
add("P6", P6_T, P6, "Retrieval", "How do bees help plants make seeds and fruit?",
    ["By carrying pollen between flowers","By eating harmful insects","By watering the plants","By keeping the soil warm"],
    "By carrying pollen between flowers","'they carry pollen with them. This pollen allows plants to make seeds and fruit'.")
add("P6", P6_T, P6, "Retrieval", "Which of these is NOT given as a reason for falling bee numbers?",
    ["Too many beekeepers","Loss of wild flowers","Harmful chemicals","Changes in climate"],
    "Too many beekeepers","The passage lists loss of wild flowers, chemicals and climate change, not too many beekeepers.")
add("P6", P6_T, P6, "Language", "Describing bees as 'buzzing nuisances' at the start is used to:",
    ["set up a view the writer will then argue against","show the writer hates bees","make readers laugh","describe the sound of a picnic"],
    "set up a view the writer will then argue against","The writer presents a common dismissive view, then counters it to strengthen the argument.")
add("P6", P6_T, P6, "Inference", "The phrase 'protecting our own future too' suggests that:",
    ["humans depend on bees for food","bees will attack us","gardens are dangerous","the future is already decided"],
    "humans depend on bees for food","Because bees pollinate our crops, protecting them protects our food supply and future.")
add("P6", P6_T, P6, "Retrieval", "Which action does the writer suggest readers can take?",
    ["Planting flowers","Buying more honey","Keeping bees as pets","Moving to the countryside"],
    "Planting flowers","The writer suggests 'planting flowers, avoiding chemical sprays, and leaving a corner of the garden to grow wild'.")
add("P6", P6_T, P6, "Vocabulary", "In this passage, 'dismiss' (to dismiss bees as nuisances) means to:",
    ["treat as unimportant","send away from school","wave goodbye","frighten off"],
    "treat as unimportant","To dismiss something here means to regard it as unimportant or not worth attention.")

if __name__ == "__main__":
    import json, sys
    json.dump(Q, sys.stdout, ensure_ascii=False)
