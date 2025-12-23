import { atom } from "jotai";

export type FileType = {
  _id: string;
  filename: string;
    user: string;
  status: string;
  type: "image" | "video";
  thumbnail?: string;
};

export const filesAtom = atom<FileType[]>([]);
