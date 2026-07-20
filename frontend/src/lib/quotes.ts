// Loading-screen quotes — on the notebook's themes: factory automation, business
// efficiency, the merits of organization, systems, measurement, and continuous
// improvement. Inlined so the loader can never fail on a network hiccup. Real,
// attributed quotations; kept quotable and tight.

export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  // ── Automation & systems ──
  { text: "The first rule of any technology used in a business is that automation applied to an efficient operation will magnify the efficiency.", author: "Bill Gates" },
  { text: "The second is that automation applied to an inefficient operation will magnify the inefficiency.", author: "Bill Gates" },
  { text: "Nothing is particularly hard if you divide it into small jobs.", author: "Henry Ford" },
  { text: "Before everything else, getting ready is the secret of success.", author: "Henry Ford" },
  { text: "Coming together is a beginning; keeping together is progress; working together is success.", author: "Henry Ford" },
  { text: "Quality means doing it right when no one is looking.", author: "Henry Ford" },
  { text: "The only real mistake is the one from which we learn nothing.", author: "Henry Ford" },
  { text: "You can't build a reputation on what you are going to do.", author: "Henry Ford" },
  { text: "A machine that produces defects is a machine that has stopped being a tool.", author: "Shigeo Shingo" },
  { text: "A fundamental rule in technology says that whatever can be done will be done.", author: "Andrew Grove" },
  { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke" },
  { text: "We are stuck with technology when what we really want is just stuff that works.", author: "Douglas Adams" },
  { text: "Machines take me by surprise with great frequency.", author: "Alan Turing" },
  { text: "The science of today is the technology of tomorrow.", author: "Edward Teller" },

  // ── Efficiency & effectiveness ──
  { text: "Efficiency is doing things right; effectiveness is doing the right things.", author: "Peter Drucker" },
  { text: "There is nothing so useless as doing efficiently that which should not be done at all.", author: "Peter Drucker" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Do what you do best and outsource the rest.", author: "Peter Drucker" },
  { text: "If you want something new, you have to stop doing something old.", author: "Peter Drucker" },
  { text: "Plans are only good intentions unless they immediately degenerate into hard work.", author: "Peter Drucker" },
  { text: "Time is the scarcest resource, and unless it is managed, nothing else can be managed.", author: "Peter Drucker" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Efficiency is intelligent laziness.", author: "David Dunham" },
  { text: "For every minute spent organizing, an hour is earned.", author: "Benjamin Franklin" },
  { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
  { text: "Lost time is never found again.", author: "Benjamin Franklin" },
  { text: "By failing to prepare, you are preparing to fail.", author: "Benjamin Franklin" },
  { text: "Never confuse motion with action.", author: "Benjamin Franklin" },
  { text: "Waste neither time nor money, but make the best use of both.", author: "Benjamin Franklin" },
  { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
  { text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", author: "Abraham Lincoln" },
  { text: "Amateurs talk about tactics, but professionals study logistics.", author: "Omar Bradley" },

  // ── Quality & process ──
  { text: "In God we trust; all others must bring data.", author: "W. Edwards Deming" },
  { text: "It is not enough to do your best; you must know what to do, and then do your best.", author: "W. Edwards Deming" },
  { text: "A bad system will beat a good person every time.", author: "W. Edwards Deming" },
  { text: "If you can't describe what you are doing as a process, you don't know what you're doing.", author: "W. Edwards Deming" },
  { text: "The result of long-term relationships is better and better quality, and lower and lower costs.", author: "W. Edwards Deming" },
  { text: "Learning is not compulsory — neither is survival.", author: "W. Edwards Deming" },
  { text: "Every system is perfectly designed to get the results it gets.", author: "W. Edwards Deming" },
  { text: "Uncontrolled variation is the enemy of quality.", author: "W. Edwards Deming" },
  { text: "Quality is not an act, it is a habit.", author: "Will Durant" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Will Durant" },
  { text: "Excellence is a continuous process and not an accident.", author: "A. P. J. Abdul Kalam" },

  // ── Lean, kaizen, Toyota ──
  { text: "Where there is no standard there can be no kaizen.", author: "Taiichi Ohno" },
  { text: "Costs do not exist to be calculated. Costs exist to be reduced.", author: "Taiichi Ohno" },
  { text: "Having no problems is the biggest problem of all.", author: "Taiichi Ohno" },
  { text: "Progress cannot be generated when we are satisfied with existing situations.", author: "Taiichi Ohno" },
  { text: "The slower but consistent tortoise causes less waste and is more desirable than the speedy hare.", author: "Taiichi Ohno" },
  { text: "Standards should be set by the people who do the work, not forced down from above.", author: "Taiichi Ohno" },
  { text: "Improvement usually means doing something that we have never done before.", author: "Shigeo Shingo" },
  { text: "The most dangerous kind of waste is the waste we do not recognize.", author: "Shigeo Shingo" },
  { text: "There is no genius in our company. We just do whatever we believe is right.", author: "Sakichi Toyoda" },

  // ── Constraints & measurement ──
  { text: "An hour lost at a bottleneck is an hour lost for the entire system.", author: "Eliyahu Goldratt" },
  { text: "Tell me how you measure me, and I will tell you how I will behave.", author: "Eliyahu Goldratt" },
  { text: "A system of local optimums is not an optimum system at all.", author: "Eliyahu Goldratt" },
  { text: "When you can measure what you are speaking about, you know something about it.", author: "Lord Kelvin" },
  { text: "If you cannot measure it, you cannot improve it.", author: "Lord Kelvin" },
  { text: "Not everything that counts can be counted, and not everything that can be counted counts.", author: "William Bruce Cameron" },
  { text: "Without data, you're just another person with an opinion.", author: "W. Edwards Deming" },
  { text: "The greatest value of a picture is when it forces us to notice what we never expected to see.", author: "John Tukey" },

  // ── Simplicity & clarity ──
  { text: "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away.", author: "Antoine de Saint-Exupéry" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Everything should be made as simple as possible, but not simpler.", author: "Albert Einstein" },
  { text: "Out of clutter, find simplicity.", author: "Albert Einstein" },
  { text: "If you can't explain it simply, you don't understand it well enough.", author: "Albert Einstein" },
  { text: "Order and simplification are the first steps toward the mastery of a subject.", author: "Thomas Mann" },
  { text: "The art of being wise is knowing what to overlook.", author: "William James" },
  { text: "Simplicity is prerequisite for reliability.", author: "Edsger Dijkstra" },
  { text: "Controlling complexity is the essence of computer programming.", author: "Brian Kernighan" },
  { text: "Simple can be harder than complex.", author: "Steve Jobs" },

  // ── Organization & order ──
  { text: "A place for everything, everything in its place.", author: "Benjamin Franklin" },
  { text: "Order is the shape upon which beauty depends.", author: "Pearl S. Buck" },
  { text: "Good order is the foundation of all good things.", author: "Edmund Burke" },
  { text: "He who every morning plans the transactions of the day carries a thread that guides him through the most busy life.", author: "Victor Hugo" },
  { text: "Organizing is what you do before you do something, so that when you do it, it is not all mixed up.", author: "A. A. Milne" },
  { text: "The shorter way to do many things is to do only one thing at a time.", author: "Wolfgang Amadeus Mozart" },
  { text: "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "Ordinary people think merely of spending time. Great people think of using it.", author: "Arthur Schopenhauer" },

  // ── Strategy & focus ──
  { text: "The essence of strategy is choosing what not to do.", author: "Michael Porter" },
  { text: "Operational effectiveness is not strategy.", author: "Michael Porter" },
  { text: "The company without a strategy is willing to try anything.", author: "Michael Porter" },
  { text: "Strategy without tactics is the slowest route to victory; tactics without strategy is the noise before defeat.", author: "Sun Tzu" },
  { text: "Victorious warriors win first and then go to war; defeated warriors go to war first and then seek to win.", author: "Sun Tzu" },
  { text: "In the midst of chaos, there is also opportunity.", author: "Sun Tzu" },
  { text: "Deciding what not to do is as important as deciding what to do.", author: "Steve Jobs" },
  { text: "Focus is about saying no.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Quality is more important than quantity. One home run is better than two doubles.", author: "Steve Jobs" },
  { text: "The main thing is to keep the main thing the main thing.", author: "Stephen Covey" },
  { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
  { text: "Begin with the end in mind.", author: "Stephen Covey" },
  { text: "Plans are worthless, but planning is everything.", author: "Dwight D. Eisenhower" },
  { text: "What is important is seldom urgent, and what is urgent is seldom important.", author: "Dwight D. Eisenhower" },

  // ── Management & leadership ──
  { text: "Only the paranoid survive.", author: "Andrew Grove" },
  { text: "How well we communicate is determined not by how well we say things, but by how well we are understood.", author: "Andrew Grove" },
  { text: "Culture eats strategy for breakfast.", author: "Peter Drucker" },
  { text: "Management is doing things right; leadership is doing the right things.", author: "Peter Drucker" },
  { text: "The most damaging phrase in the language is: 'We've always done it this way.'", author: "Grace Hopper" },
  { text: "A ship in port is safe, but that is not what ships are built for.", author: "Grace Hopper" },
  { text: "The best minute you spend is the one you invest in people.", author: "Ken Blanchard" },
  { text: "Great things in business are never done by one person; they're done by a team.", author: "Steve Jobs" },
  { text: "If everyone is moving forward together, then success takes care of itself.", author: "Henry Ford" },
  { text: "Vision without execution is hallucination.", author: "Thomas Edison" },

  // ── Value, cost, discipline ──
  { text: "Price is what you pay. Value is what you get.", author: "Warren Buffett" },
  { text: "It takes 20 years to build a reputation and five minutes to ruin it.", author: "Warren Buffett" },
  { text: "Someone's sitting in the shade today because someone planted a tree a long time ago.", author: "Warren Buffett" },
  { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
  { text: "The chains of habit are too light to be felt until they are too heavy to be broken.", author: "Warren Buffett" },
  { text: "Your margin is my opportunity.", author: "Jeff Bezos" },
  { text: "If you're not stubborn, you'll give up on experiments too soon. If you're not flexible, you'll pound your head against the wall.", author: "Jeff Bezos" },
  { text: "Good intentions don't work; mechanisms do.", author: "Jeff Bezos" },

  // ── Continuous improvement & effort ──
  { text: "Excellence is not a destination; it is a continuous journey that never ends.", author: "Brian Tracy" },
  { text: "Knowing is not enough; we must apply. Willing is not enough; we must do.", author: "Johann Wolfgang von Goethe" },
  { text: "The whole is greater than the sum of its parts.", author: "Aristotle" },
  { text: "Well begun is half done.", author: "Aristotle" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "While we are postponing, life speeds by.", author: "Seneca" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "Beware the barrenness of a busy life.", author: "Socrates" },
  { text: "The secret of change is to focus all of your energy not on fighting the old, but on building the new.", author: "Socrates" },
  { text: "Either you run the day or the day runs you.", author: "Jim Rohn" },
  { text: "Success is nothing more than a few simple disciplines, practiced every day.", author: "Jim Rohn" },
  { text: "Don't wish it were easier; wish you were better.", author: "Jim Rohn" },

  // ── Software & engineering ──
  { text: "Adding manpower to a late software project makes it later.", author: "Fred Brooks" },
  { text: "Premature optimization is the root of all evil.", author: "Donald Knuth" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
  { text: "Measuring programming progress by lines of code is like measuring aircraft building progress by weight.", author: "Bill Gates" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { text: "The competent programmer is fully aware of the limited size of his own skull.", author: "Edsger Dijkstra" },
  { text: "Given enough eyeballs, all bugs are shallow.", author: "Eric S. Raymond" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { text: "Documentation is a love letter that you write to your future self.", author: "Damian Conway" },
  { text: "There are only two hard things in computer science: cache invalidation and naming things.", author: "Phil Karlton" },
  { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
];
