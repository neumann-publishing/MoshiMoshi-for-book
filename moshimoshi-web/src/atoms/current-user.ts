import { atom } from "jotai";
import Cookies from "js-cookie";
import type { User } from "../types";

export const jwtTokenAtom = atom<string>(Cookies.get("jwt-token"));
export const currentUserAtom = atom<User>();
