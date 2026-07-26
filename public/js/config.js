export const defaultPlayers = {
  "Marquee Set": ["Virat Kohli - b", "Surya Kumar Yadav - b", "Jos Buttler ✈️ - wk", "Hardik Pandya - ar", "Jasprit Bumrah - fb", "KL Rahul - wk", "Varun Chakravarthy - s", "Yuzvendra Chahal - s", "Mitchell Starc ✈️ - fb", "Ravindra Jadeja - ar", "Axar Patel - ar", "Shreyas Iyer - b"],
  "Wicket Keeper 1": ["Rishabh Pant", "Ishan Kishan", "Sanju Samson", "Dinesh Karthik", "MS Dhoni", "Heinrich Klaasen ✈️", "Nicholas Pooran ✈️", "Jitesh Sharma", "Phil Salt ✈️", "Tristan Stubbs ✈️", "Josh Inglis ✈️"],
  "Batsman 1": ["Rohit Sharma", "Shubman Gill", "Ruturaj Gaikwad", "Abhishek Sharma", "Yashasvi Jaiswal", "Travis Head ✈️", "David Miller ✈️", "Tilak Varma", "Rajat Patidar", "Sai Sudharsan"],
  "Fast Bowler 1": ["Mohammad Siraj", "Mohammed Shami", "Bhuvneshwar Kumar", "Arshdeep Singh", "Prasidh Krishna", "Josh Hazlewood ✈️", "Jofra Archer ✈️", "Kagiso Rabada ✈️", "Trent Boult ✈️", "Pat Cummins ✈️"],
  "Spinner 1": ["Kuldeep Yadav", "Ravi Bishnoi", "Rashid Khan ✈️", "Noor Ahmad ✈️", "Wanindu Hasaranga ✈️", "Digvesh Rathi", "Adam Zampa ✈️"],
  "All-rounder 1": ["Shivam Dube", "Nitish Reddy", "Harshal Patel", "Venkatesh Iyer", "Ramandeep Singh", "Rahul Tewatia", "Krunal Pandya", "Washington Sundar", "Riyan Parag", "Ravichandran Ashwin", "Sai Kishore", "Nitish Rana"],
  "Wicket Keeper 2": ["Finn Allen ✈️", "Ryan Rickelton ✈️", "KS Bharat", "Prabhsimran Singh", "Dhruv Jurel", "Abishek Porel", "Devon Conway ✈️", "Rahmanullah Gurbaz ✈️", "Quinton de Kock ✈️", "Jonny Bairstow ✈️"],
  "Batsman 2": ["Shimron Hetmyer ✈️", "Shashank Singh","Ashutosh Sharma", "Devdutt Padikkal", "Rinku Singh", "Faf Du Plessis ✈️", "Aiden Markram ✈️", "Glenn Phillips ✈️", "Nehal Wadhera", "Rovman Powell ✈️"],
  "Fast Bowler 2": [ "Lockie Ferguson ✈️", "Anrich Nortje ✈️", "Mark Wood ✈️", "Matheesha Pathirana ✈️", "Lungi Ngidi ✈️", "Harshit Rana", "Sandeep Sharma", "T Natarajan", "Shardul Thakur", "Deepak Chahar"],
  "Spinner 2": ["Adil Rashid ✈️", "Shreyas Gopal", "Harpreet Brar", "Suyash Sharma", "Allah Ghazanfar ✈️", "Mujeeb Ur Rahman ✈️", "Mayank Markande", "Rahul Chahar", "Maheesh Theekshana ✈️"],
  "All-rounder 2": ["Andre Russell ✈️", "Romario Shepherd ✈️", "Marcus Stoinis ✈️", "Sam Curran ✈️", "Marco Jansen ✈️", "Tim David ✈️", "Mitchell Marsh ✈️", "Cam Green ✈️", "Jacob Bethell ✈️", "Will Jacks ✈️", "Sunil Narine ✈️", "Mitchell Santner ✈️"],
  "Batsman 3": ["Mayank Agarwal", "Angkrish Raghuvanshi", "Sarfaraz Khan", "Ajinkya Rahane", "Ayush Mhatre", "Vaibhav Sooryavanshi", "Aniket Verma", "Priyansh Arya", "Naman Dhir", "Dewald Breis ✈️"],
  "Fast Bowler 3": [ "Ishant Sharma", "Vyshak Vijay Kumar", "Mohit Sharma", "Mayank Yadav", "Akash Madhwal", "Anshul Kamboj", "Avesh Khan", "Akash Deep", "Jaydev Unadkat", "Khaleel Ahmed", "Mukesh Kumar", "Yash Dayal"],
  "All-rounder 3": ["Shabaz Ahmed", "Deepak Hooda", "Vipraj Nigam", "Swapnil Singh", "Ayush Badoni", "Azmatullah Omarzai ✈️", "Sherfane Rutherford ✈️", "Dasun Shanaka ✈️", "Kamindu Mendis ✈️", "Liam Livingstone ✈️", "Rachin Ravindra ✈️", "Glenn Maxwell ✈️"],
  "Batsman 4": ["Jake Fraser McGurk ✈️", "Steve Smith ✈️", "David Warner ✈️", "Kane Williamson ✈️", "Rahul Tripathi", "Karun Nair", "Prithvi Shaw", "Abdul Samad", "Shahrukh Khan", "Manish Pandey"],
  "Fast Bowler 4": ["Dushmantha Chameera ✈️", "Nuwan Thushara ✈️", "Nandre Burger ✈️", "Kyle Jamieson ✈️", "Tushar Deshpande", "Nathan Ellis ✈️", "Umran Malik", "Mohsin Khan", "Rasikh Dar", "Vaibhav Arora"],
};

export const IPL_2026_COMPETITION_ID = '284';
export const IPL_STATS_BASE = 'https://ipl-stats-sports-mechanic.s3.ap-south-1.amazonaws.com/ipl/feeds/stats';
export const OFFICIAL_2026_LOCAL_FILE = 'official_ipl_2026_stats.json';
export const OFFICIAL_2025_LOCAL_FILE = 'official_ipl_2025_stats.json';
export const OFFICIAL_2024_LOCAL_FILE = 'official_ipl_2024_stats.json';
export const OFFICIAL_CAREER_LOCAL_FILE = 'official_ipl_career_stats.json';
export const IPL_2026_FEEDS = {
  batting: `${IPL_STATS_BASE}/${IPL_2026_COMPETITION_ID}-toprunsscorers.js`,
  bowling: `${IPL_STATS_BASE}/${IPL_2026_COMPETITION_ID}-mostwickets.js`
};
export const STATS_SEASONS = ['2026', '2025', '2024'];
export const PLAYER_PLACEHOLDER_IMAGE = 'https://scores.iplt20.com/ipl/images/default-player-statsImage.png';

export const playerNameAliases = {
  "suryakumar yadav": "surya kumar yadav",
  "bhuvaneshwar kumar": "bhuvneshwar kumar",
  "mateesha pathirana": "matheesha pathirana",
  "cam green": "cameron green",
  "mohammad siraj": "mohammed siraj",
  "mohammed shami": "mohammad shami",
  "varun chakravarthy": "varun chakaravarthy",
  "varun charavarthy": "varun chakaravarthy",
  "nitish reddy": "nitish kumar reddy",
  "shabaz ahmed": "shahbaz ahamad",
  "vyshak vijay kumar": "vyshak vijaykumar",
  "tilak varma": "n tilak varma",
  "vaibhav sooryavanshi": "vaibhav suryavanshi",
  "lungi ngidi": "lungisani ngidi",
  "kl rahul": "k l rahul",
  "digvest rathi": "digvesh singh",
  "digvesh rathi": "digvesh singh",
  "digvesh singh rathi": "digvesh singh",
  "quinton decock": "quinton de kock",
  "rajath patidar": "rajat patidar",
  "nuwan tushara": "nuwan thushara",
  "rasik salam dar": "rasikh dar",
  "rasikh salam dar": "rasikh dar"
};

export const playerImageNameAliases = {
  "travis head": ["Travis Head"],
  "yash dayal": ["Yash Dayal"],
  "pat cummins": ["Pat Cummins"],
  "kl rahul": ["KL Rahul", "K L Rahul"],
  "k l rahul": ["KL Rahul", "K L Rahul"],
  "digvest rathi": ["Digvesh Singh", "Digvesh Singh Rathi"],
  "digvesh rathi": ["Digvesh Singh", "Digvesh Singh Rathi"],
  "digvesh singh": ["Digvesh Singh", "Digvesh Singh Rathi"],
  "digvesh singh rathi": ["Digvesh Singh", "Digvesh Singh Rathi"],
  "quinton decock": ["Quinton De Kock"],
  "quinton de kock": ["Quinton De Kock"],
  "rajath patidar": ["Rajat Patidar"],
  "rajat patidar": ["Rajat Patidar"],
  "nuwan tushara": ["Nuwan Thushara"],
  "nuwan thushara": ["Nuwan Thushara"],
  "pat cummins": ["Pat Cummins"],
  "yash dayal": ["Yash Dayal"],
  "rasik salam dar": ["Rasikh Dar", "Rasikh Salam"],
  "rasikh salam dar": ["Rasikh Dar", "Rasikh Salam"],
  "rasikh dar": ["Rasikh Dar", "Rasikh Salam"]
};

export const whiteBackgroundPlayers = new Set([
  'abhishek sharma'
]);
