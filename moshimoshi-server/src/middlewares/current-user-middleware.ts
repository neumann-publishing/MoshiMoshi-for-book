import dayjs from "dayjs";
import { createMiddleware } from "hono/factory";
import { Selectable } from "kysely";
import { Users } from "../db/db";
import * as usersModel from "../models/users";

type currentUserVariables = {
	currentUser: Selectable<Users>;
};

// NOTE hono/jwt を直前に使っていることを前提とする
export const currentUserMiddleware = createMiddleware<{
	Variables: currentUserVariables;
}>(async (c, next) => {
	const payload = c.get("jwtPayload");
	if (!payload) {
		return c.json({ message: "Unauthorized" }, 401);
	}

	// NOTE hono/jwt では expire を検証してくれないので自前で検証する
	if (dayjs.unix(payload.exp).isBefore(dayjs())) {
		return c.json({ message: "Unauthorized" }, 401);
	}

	// NOTE 現在ログイン中のユーザー情報を currentUser にいれる
	const user = await usersModel.find(parseInt(payload.sub));

	if (!user) {
		return c.json({ message: "User not found" }, 404);
	}

	c.set("currentUser", user);

	await next();
});
