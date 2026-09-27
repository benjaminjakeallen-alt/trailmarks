export type Region = "Northeast" | "Midwest" | "South" | "West";

export interface StateInfo {
  /** USPS abbreviation, used as the primary key everywhere in the app/URLs. */
  code: string;
  /** Census FIPS code, matches the `id` field in us-atlas topojson features. */
  fips: string;
  name: string;
  capital: string;
  region: Region;
  /** Land area in square miles, used for the "% of North America explored" stat. */
  areaSqMi: number;
  funFact: string;
}

export const STATES: StateInfo[] = [
  { code: "AL", fips: "01", name: "Alabama", capital: "Montgomery", region: "South", areaSqMi: 50645, funFact: "Home to the U.S. Space & Rocket Center in Huntsville." },
  { code: "AK", fips: "02", name: "Alaska", capital: "Juneau", region: "West", areaSqMi: 570641, funFact: "Has more coastline than all other states combined." },
  { code: "AZ", fips: "04", name: "Arizona", capital: "Phoenix", region: "West", areaSqMi: 113594, funFact: "The Grand Canyon is over a mile deep." },
  { code: "AR", fips: "05", name: "Arkansas", capital: "Little Rock", region: "South", areaSqMi: 52035, funFact: "The only U.S. diamond mine open to the public is here." },
  { code: "CA", fips: "06", name: "California", capital: "Sacramento", region: "West", areaSqMi: 155779, funFact: "Home to both the highest and lowest points in the contiguous U.S." },
  { code: "CO", fips: "08", name: "Colorado", capital: "Denver", region: "West", areaSqMi: 103642, funFact: "Has the highest average elevation of any state." },
  { code: "CT", fips: "09", name: "Connecticut", capital: "Hartford", region: "Northeast", areaSqMi: 4842, funFact: "The first hamburger was reportedly served here in 1900." },
  { code: "DE", fips: "10", name: "Delaware", capital: "Dover", region: "Northeast", areaSqMi: 1949, funFact: "The first state to ratify the U.S. Constitution." },
  { code: "FL", fips: "12", name: "Florida", capital: "Tallahassee", region: "South", areaSqMi: 53625, funFact: "The only place on Earth where alligators and crocodiles coexist." },
  { code: "GA", fips: "13", name: "Georgia", capital: "Atlanta", region: "South", areaSqMi: 57513, funFact: "Produces the most peanuts, pecans, and peaches in the U.S." },
  { code: "HI", fips: "15", name: "Hawaii", capital: "Honolulu", region: "West", areaSqMi: 6423, funFact: "The only state made entirely of islands." },
  { code: "ID", fips: "16", name: "Idaho", capital: "Boise", region: "West", areaSqMi: 82643, funFact: "Grows about a third of the country's potatoes." },
  { code: "IL", fips: "17", name: "Illinois", capital: "Springfield", region: "Midwest", areaSqMi: 55519, funFact: "Home to the first skyscraper, built in Chicago in 1885." },
  { code: "IN", fips: "18", name: "Indiana", capital: "Indianapolis", region: "Midwest", areaSqMi: 35826, funFact: "Home of the Indianapolis 500, the world's largest single-day sporting event." },
  { code: "IA", fips: "19", name: "Iowa", capital: "Des Moines", region: "Midwest", areaSqMi: 55857, funFact: "More pigs live in Iowa than people, by a wide margin." },
  { code: "KS", fips: "20", name: "Kansas", capital: "Topeka", region: "Midwest", areaSqMi: 81759, funFact: "The exact geographic center of the contiguous U.S. is here." },
  { code: "KY", fips: "21", name: "Kentucky", capital: "Frankfort", region: "South", areaSqMi: 39486, funFact: "Mammoth Cave, the longest known cave system on Earth, is here." },
  { code: "LA", fips: "22", name: "Louisiana", capital: "Baton Rouge", region: "South", areaSqMi: 43204, funFact: "New Orleans is famous for jazz, born in the early 1900s." },
  { code: "ME", fips: "23", name: "Maine", capital: "Augusta", region: "Northeast", areaSqMi: 30843, funFact: "The first place in the U.S. to see the sunrise each day." },
  { code: "MD", fips: "24", name: "Maryland", capital: "Annapolis", region: "Northeast", areaSqMi: 9707, funFact: "The national anthem was written here during the War of 1812." },
  { code: "MA", fips: "25", name: "Massachusetts", capital: "Boston", region: "Northeast", areaSqMi: 7800, funFact: "Basketball and volleyball were both invented here." },
  { code: "MI", fips: "26", name: "Michigan", capital: "Lansing", region: "Midwest", areaSqMi: 96714, funFact: "Borders four of the five Great Lakes." },
  { code: "MN", fips: "27", name: "Minnesota", capital: "Saint Paul", region: "Midwest", areaSqMi: 86936, funFact: "Actually has more than 11,000 lakes, not just 10,000." },
  { code: "MS", fips: "28", name: "Mississippi", capital: "Jackson", region: "South", areaSqMi: 46923, funFact: "The birthplace of the blues, rock and roll, and root beer." },
  { code: "MO", fips: "29", name: "Missouri", capital: "Jefferson City", region: "Midwest", areaSqMi: 69707, funFact: "The Gateway Arch is the tallest man-made monument in the U.S." },
  { code: "MT", fips: "30", name: "Montana", capital: "Helena", region: "West", areaSqMi: 145546, funFact: "Glacier National Park has over 700 miles of hiking trails." },
  { code: "NE", fips: "31", name: "Nebraska", capital: "Lincoln", region: "Midwest", areaSqMi: 76824, funFact: "Kool-Aid was invented in Hastings, Nebraska." },
  { code: "NV", fips: "32", name: "Nevada", capital: "Carson City", region: "West", areaSqMi: 110572, funFact: "The driest state, and one of the sunniest, in the country." },
  { code: "NH", fips: "33", name: "New Hampshire", capital: "Concord", region: "Northeast", areaSqMi: 8953, funFact: "Home to the world's first potato ever planted in the U.S. (1719)." },
  { code: "NJ", fips: "34", name: "New Jersey", capital: "Trenton", region: "Northeast", areaSqMi: 7354, funFact: "Has the highest population density of any state." },
  { code: "NM", fips: "35", name: "New Mexico", capital: "Santa Fe", region: "West", areaSqMi: 121298, funFact: "Home to White Sands, a sea of gypsum dunes." },
  { code: "NY", fips: "36", name: "New York", capital: "Albany", region: "Northeast", areaSqMi: 47126, funFact: "Niagara Falls sends about 3,160 tons of water over the edge every second." },
  { code: "NC", fips: "37", name: "North Carolina", capital: "Raleigh", region: "South", areaSqMi: 48618, funFact: "The Wright brothers made their first flight at Kitty Hawk." },
  { code: "ND", fips: "38", name: "North Dakota", capital: "Bismarck", region: "Midwest", areaSqMi: 69001, funFact: "Home to the geographic center of North America (Rugby, ND)." },
  { code: "OH", fips: "39", name: "Ohio", capital: "Columbus", region: "Midwest", areaSqMi: 40861, funFact: "Birthplace of aviation pioneers the Wright brothers." },
  { code: "OK", fips: "40", name: "Oklahoma", capital: "Oklahoma City", region: "South", areaSqMi: 68595, funFact: "The parking meter was invented here in 1935." },
  { code: "OR", fips: "41", name: "Oregon", capital: "Salem", region: "West", areaSqMi: 95988, funFact: "Crater Lake is the deepest lake in the United States." },
  { code: "PA", fips: "42", name: "Pennsylvania", capital: "Harrisburg", region: "Northeast", areaSqMi: 44743, funFact: "The Liberty Bell and Independence Hall are in Philadelphia." },
  { code: "RI", fips: "44", name: "Rhode Island", capital: "Providence", region: "Northeast", areaSqMi: 1034, funFact: "The smallest state, but has 400 miles of coastline." },
  { code: "SC", fips: "45", name: "South Carolina", capital: "Columbia", region: "South", areaSqMi: 30061, funFact: "The first shots of the Civil War were fired at Fort Sumter." },
  { code: "SD", fips: "46", name: "South Dakota", capital: "Pierre", region: "Midwest", areaSqMi: 75811, funFact: "Mount Rushmore's faces are each about 60 feet tall." },
  { code: "TN", fips: "47", name: "Tennessee", capital: "Nashville", region: "South", areaSqMi: 41235, funFact: "Nashville is the birthplace of country music." },
  { code: "TX", fips: "48", name: "Texas", capital: "Austin", region: "South", areaSqMi: 261232, funFact: "Big enough that El Paso is closer to California than to Dallas." },
  { code: "UT", fips: "49", name: "Utah", capital: "Salt Lake City", region: "West", areaSqMi: 82170, funFact: "Home to five national parks, the 'Mighty 5'." },
  { code: "VT", fips: "50", name: "Vermont", capital: "Montpelier", region: "Northeast", areaSqMi: 9217, funFact: "The first state to abolish slavery, in 1777." },
  { code: "VA", fips: "51", name: "Virginia", capital: "Richmond", region: "South", areaSqMi: 39490, funFact: "Eight U.S. presidents were born in Virginia." },
  { code: "WA", fips: "53", name: "Washington", capital: "Olympia", region: "West", areaSqMi: 66456, funFact: "Home to the only rainforest in the continental U.S." },
  { code: "WV", fips: "54", name: "West Virginia", capital: "Charleston", region: "South", areaSqMi: 24038, funFact: "The New River Gorge Bridge is one of the highest in the U.S." },
  { code: "WI", fips: "55", name: "Wisconsin", capital: "Madison", region: "Midwest", areaSqMi: 54158, funFact: "Produces more cheese than any other state." },
  { code: "WY", fips: "56", name: "Wyoming", capital: "Cheyenne", region: "West", areaSqMi: 97093, funFact: "Home to Yellowstone, the first national park in the world." },
  { code: "DC", fips: "11", name: "District of Columbia", capital: "Washington", region: "Northeast", areaSqMi: 68, funFact: "Not a state, but every trail counts — the U.S. capital." },
];

export const STATE_COUNT = STATES.filter((s) => s.code !== "DC").length;

export const STATES_BY_CODE: Record<string, StateInfo> = Object.fromEntries(
  STATES.map((s) => [s.code, s]),
);

export const STATES_BY_FIPS: Record<string, StateInfo> = Object.fromEntries(
  STATES.map((s) => [s.fips, s]),
);

export function totalAreaSqMi(codes: string[]): number {
  return codes.reduce((sum, code) => sum + (STATES_BY_CODE[code]?.areaSqMi ?? 0), 0);
}
