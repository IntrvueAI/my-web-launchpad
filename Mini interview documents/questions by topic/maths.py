"""Original 11+ Maths question bank. Answers computed in code so they are verifiable."""
from fractions import Fraction

Q = []

def add(topic, difficulty, question, options, answer, explanation):
    assert answer in options, f"answer not in options: {question}"
    Q.append({
        "subject": "Maths", "topic": topic, "difficulty": difficulty,
        "question": question, "options": list(options),
        "answer": answer, "explanation": explanation,
    })

def opts(correct, distractors):
    """Return 4 options containing correct + 3 distractors, stable order."""
    o = [correct] + [d for d in distractors if d != correct][:3]
    # de-dup keep order
    seen, out = set(), []
    for x in o:
        if x not in seen:
            seen.add(x); out.append(x)
    return out[:4]

# ---- Arithmetic / place value ----
add("Place value","Standard","What is the value of the digit 7 in the number 4,728?",
    ["7","70","700","7000"],"700","The 7 is in the hundreds column, so it is worth 7 x 100 = 700.")
add("Rounding","Standard","Round 6,847 to the nearest hundred.",
    ["6,800","6,850","6,900","7,000"],"6,800","The tens digit is 4 (less than 5), so we round down to 6,800.")
add("Rounding","Standard","Round 3.567 to one decimal place.",
    ["3.5","3.6","3.7","4.0"],"3.6","The second decimal digit is 6 (5 or more), so the first decimal rounds up from 5 to 6.")
add("Arithmetic","Standard","Calculate 3,205 - 1,648.",
    ["1,557","1,657","1,547","2,557"],"1,557","3,205 - 1,648 = 1,557 (borrowing through the columns).")
add("Arithmetic","Standard","What is 48 x 25?",
    ["1,200","1,000","1,250","960"],"1,200","48 x 25 = 48 x 100 / 4 = 4,800 / 4 = 1,200.")
add("Arithmetic","Standard","What is 936 divided by 8?",
    ["117","116","118","127"],"117","8 x 117 = 936, so 936 / 8 = 117.")
add("Order of operations","Standard","Work out 6 + 4 x 3.",
    ["18","30","22","13"],"18","Multiplication before addition: 4 x 3 = 12, then 6 + 12 = 18.")
add("Order of operations","Standard","Work out (12 - 4) x 2 + 5.",
    ["21","19","17","26"],"21","Brackets first: 12 - 4 = 8; 8 x 2 = 16; 16 + 5 = 21.")
add("Negative numbers","Standard","The temperature is -3C and rises by 8C. What is the new temperature?",
    ["5C","-11C","11C","-5C"],"5C","-3 + 8 = 5C.")
add("Negative numbers","Standard","What is -7 + (-5)?",
    ["-12","-2","12","2"],"-12","Adding a negative makes it more negative: -7 - 5 = -12.")

# ---- Factors, multiples, primes ----
add("Factors & multiples","Standard","Which of these is a common multiple of 4 and 6?",
    ["24","18","20","14"],"24","24 = 4 x 6 and 24 = 6 x 4; it is in both times tables (the others are not).")
add("Factors & multiples","Standard","What is the highest common factor (HCF) of 18 and 24?",
    ["6","3","12","9"],"6","Factors of 18: 1,2,3,6,9,18; of 24: 1,2,3,4,6,8,12,24. The largest shared factor is 6.")
add("Primes","Standard","Which of these numbers is prime?",
    ["29","27","33","21"],"29","29 has only the factors 1 and 29. The others divide by 3.")
add("Factors & multiples","Standard","What is the lowest common multiple (LCM) of 6 and 8?",
    ["24","48","12","16"],"24","Multiples of 8: 8,16,24...; 24 is the first that is also a multiple of 6.")
add("Square numbers","Standard","What is the value of 9 squared?",
    ["81","18","72","99"],"81","9 squared means 9 x 9 = 81.")
add("Square roots","Standard","What is the square root of 144?",
    ["12","14","72","24"],"12","12 x 12 = 144.")

# ---- Fractions, decimals, percentages ----
add("Fractions","Standard","What is 3/4 of 60?",
    ["45","40","48","30"],"45","60 / 4 = 15, then 15 x 3 = 45.")
add("Fractions","Standard","Simplify the fraction 18/24.",
    ["3/4","2/3","9/12","6/8"],"3/4","Divide top and bottom by 6: 18/24 = 3/4.")
add("Fractions","Standard","What is 2/5 + 1/5?",
    ["3/5","3/10","2/25","1/5"],"3/5","Same denominator: add the numerators, 2 + 1 = 3, giving 3/5.")
add("Fractions","Standard","What is 7/8 - 1/2?",
    ["3/8","6/8","1/8","1/2"],"3/8","1/2 = 4/8, so 7/8 - 4/8 = 3/8.")
add("Decimals","Standard","What is 0.6 + 0.45?",
    ["1.05","0.51","1.5","0.105"],"1.05","Line up the decimals: 0.60 + 0.45 = 1.05.")
add("Decimals","Standard","What is 0.7 x 0.3?",
    ["0.21","2.1","0.021","0.1"],"0.21","7 x 3 = 21, and there are two decimal places in total, giving 0.21.")
add("Fraction-decimal","Standard","Which decimal is equal to 3/8?",
    ["0.375","0.38","0.3","0.83"],"0.375","3 / 8 = 0.375.")
add("Percentages","Standard","What is 25% of 80?",
    ["20","25","16","40"],"20","25% = 1/4, and 80 / 4 = 20.")
add("Percentages","Standard","What is 15% of 200?",
    ["30","15","35","45"],"30","10% of 200 = 20 and 5% = 10, so 15% = 30.")
add("Percentages","Standard","A coat costs 60. In a sale it is reduced by 20%. What is the sale price?",
    ["48","40","52","12"],"48","20% of 60 = 12, so 60 - 12 = 48.")
add("Percentages","Standard","What percentage is 18 out of 30?",
    ["60%","50%","45%","65%"],"60%","18 / 30 = 0.6 = 60%.")

# ---- Ratio & proportion ----
add("Ratio","Standard","Share 35 sweets between Amy and Ben in the ratio 3:4. How many does Ben get?",
    ["20","15","21","14"],"20","3 + 4 = 7 parts; 35 / 7 = 5 per part; Ben has 4 x 5 = 20.")
add("Ratio","Standard","A recipe uses flour and sugar in the ratio 5:2. If 10 cups of flour are used, how much sugar is needed?",
    ["4 cups","2 cups","5 cups","8 cups"],"4 cups","Flour is doubled from 5 to 10, so sugar doubles from 2 to 4.")
add("Proportion","Standard","If 3 pens cost 1.20, how much do 7 pens cost?",
    ["2.80","2.40","3.60","2.10"],"2.80","One pen costs 1.20 / 3 = 0.40; 7 x 0.40 = 2.80.")
add("Proportion","Standard","Five workers build a wall in 12 days. How long would 3 workers take (working at the same rate)?",
    ["20 days","8 days","15 days","18 days"],"20 days","Total work = 5 x 12 = 60 worker-days; 60 / 3 = 20 days.")

# ---- Algebra ----
add("Algebra","Standard","If 3n + 4 = 19, what is n?",
    ["5","6","4","7"],"5","3n = 19 - 4 = 15, so n = 15 / 3 = 5.")
add("Algebra","Standard","What is the value of 4a - 7 when a = 6?",
    ["17","24","31","11"],"17","4 x 6 = 24, then 24 - 7 = 17.")
add("Algebra","Standard","Solve 2(x + 3) = 16.",
    ["5","8","10","13"],"5","Divide by 2: x + 3 = 8, so x = 5.")
add("Sequences","Standard","What is the next term: 2, 5, 8, 11, ... ?",
    ["14","13","15","12"],"14","The pattern adds 3 each time; 11 + 3 = 14.")
add("Sequences","Standard","What is the next term: 1, 4, 9, 16, ... ?",
    ["25","20","24","32"],"25","These are square numbers; the next is 5 x 5 = 25.")
add("Sequences","Standard","Find the missing term: 80, 40, 20, ?, 5.",
    ["10","15","25","8"],"10","Each term is halved; 20 / 2 = 10.")

# ---- Geometry & measures ----
add("Perimeter","Standard","A rectangle is 9 cm long and 4 cm wide. What is its perimeter?",
    ["26 cm","36 cm","13 cm","22 cm"],"26 cm","Perimeter = 2 x (9 + 4) = 2 x 13 = 26 cm.")
add("Area","Standard","What is the area of a rectangle 7 cm by 5 cm?",
    ["35 cm2","24 cm2","12 cm2","70 cm2"],"35 cm2","Area = length x width = 7 x 5 = 35 cm2.")
add("Area","Standard","A triangle has base 10 cm and height 6 cm. What is its area?",
    ["30 cm2","60 cm2","16 cm2","32 cm2"],"30 cm2","Area = 1/2 x base x height = 1/2 x 10 x 6 = 30 cm2.")
add("Angles","Standard","Two angles on a straight line are 110 and x. What is x?",
    ["70","90","250","80"],"70","Angles on a straight line add to 180, so x = 180 - 110 = 70.")
add("Angles","Standard","What is the sum of the interior angles of a triangle?",
    ["180","360","90","270"],"180","The interior angles of any triangle always add up to 180.")
add("Angles","Standard","Three angles meet at a point: 120, 150 and x. What is x?",
    ["90","60","30","100"],"90","Angles round a point add to 360, so x = 360 - 120 - 150 = 90.")
add("Volume","Standard","What is the volume of a cube with side 4 cm?",
    ["64 cm3","16 cm3","12 cm3","48 cm3"],"64 cm3","Volume = 4 x 4 x 4 = 64 cm3.")
add("Measures","Standard","How many millilitres are there in 2.5 litres?",
    ["2,500 ml","250 ml","25 ml","25,000 ml"],"2,500 ml","1 litre = 1,000 ml, so 2.5 x 1,000 = 2,500 ml.")
add("Measures","Standard","How many minutes are there between 14:35 and 16:10?",
    ["95 minutes","85 minutes","75 minutes","105 minutes"],"95 minutes","14:35 to 16:35 is 120 min; back 25 min to 16:10 gives 95 minutes.")
add("Measures","Standard","A film starts at 19:45 and lasts 1 hour 50 minutes. When does it end?",
    ["21:35","21:25","20:35","21:55"],"21:35","19:45 + 1h = 20:45; + 50 min = 21:35.")

# ---- Data handling ----
add("Averages","Standard","What is the mean of 4, 8, 6, 10 and 7?",
    ["7","6","8","35"],"7","Sum = 35, and 35 / 5 = 7.")
add("Averages","Standard","What is the median of 3, 9, 4, 1 and 7?",
    ["4","7","5","9"],"4","In order: 1,3,4,7,9; the middle value is 4.")
add("Averages","Standard","What is the range of 12, 5, 9, 20 and 7?",
    ["15","20","13","8"],"15","Range = largest - smallest = 20 - 5 = 15.")
add("Averages","Standard","What is the mode of 2, 5, 5, 7, 2, 5?",
    ["5","2","7","4"],"5","The mode is the most common value; 5 appears three times.")
add("Probability","Standard","A bag has 3 red and 5 blue counters. What is the probability of picking a red counter?",
    ["3/8","5/8","3/5","1/3"],"3/8","There are 8 counters in total and 3 are red, so the probability is 3/8.")
add("Word problem","Standard","A bus has 52 seats. 38 are taken. 9 more people get on. How many seats are now empty?",
    ["5","14","23","6"],"5","Taken: 38 + 9 = 47; empty: 52 - 47 = 5.")

# ---- output ----
if __name__ == "__main__":
    import json, sys
    json.dump(Q, sys.stdout, ensure_ascii=False)
