export type Song = {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  tuning: string;
  duration: string;
  status: "Pronta" | "Ensaio" | "Nova";
};

export const songs: Song[] = [
  {
    id: 1,
    title: "Somewhere I Belong",
    artist: "Linkin Park",
    bpm: 162,
    key: "F#m",
    tuning: "Drop C#",
    duration: "3:33",
    status: "Pronta",
  },

  {
    id: 2,
    title: "Lying From You",
    artist: "Linkin Park",
    bpm: 160,
    key: "C#m",
    tuning: "Drop C#",
    duration: "2:55",
    status: "Pronta",
  },

  {
    id: 3,
    title: "The Emptiness Machine",
    artist: "Linkin Park",
    bpm: 184,
    key: "D",
    tuning: "Standard",
    duration: "3:10",
    status: "Pronta",
  },

  {
    id: 4,
    title: "Papercut",
    artist: "Linkin Park",
    bpm: 150,
    key: "D♭",
    tuning: "Drop C#",
    duration: "3:05",
    status: "Pronta",
  },

  {
    id: 5,
    title: "One Step Closer",
    artist: "Linkin Park",
    bpm: 95,
    key: "C#m",
    tuning: "Drop C#",
    duration: "2:36",
    status: "Pronta",
  },

  {
    id: 6,
    title: "Crawling",
    artist: "Linkin Park",
    bpm: 105,
    key: "C#m",
    tuning: "Drop C#",
    duration: "3:29",
    status: "Ensaio",
  },

  {
    id: 7,
    title: "Numb",
    artist: "Linkin Park",
    bpm: 110,
    key: "F#m",
    tuning: "Standard",
    duration: "3:07",
    status: "Pronta",
  },

  {
    id: 8,
    title: "In The End",
    artist: "Linkin Park",
    bpm: 105,
    key: "D#m",
    tuning: "Standard",
    duration: "3:36",
    status: "Pronta",
  },
];