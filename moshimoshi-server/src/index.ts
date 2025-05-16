import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import type { JwtVariables } from "hono/jwt";
import { logger } from "hono/logger";
import { Selectable } from "kysely";
import { Users } from "./db/db.js";
import { currentUserMiddleware } from "./middlewares/current-user-middleware.js";
import * as meetingsModel from "./models/meetings.js";
import * as usersModel from "./models/users.js";

type SignInVariables = JwtVariables & {
	currentUser: Selectable<Users>;
};

const app = new Hono<{ Variables: SignInVariables }>();

app.use(
	"*",
	cors({
		origin: process.env.FRONEND_URL ?? "http://localhost:3001",
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
		allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
	}),
);
app.use(logger());

app.get("/", (c) => {
	return c.text("Hello Hono!");
});

app.get("/api/", (c) => {
	return c.text("Hello Hono api!");
});

app.post("/api/sign-up", async (c) => {
	const body = await c.req.json();

	const result = await usersModel.signUp({
		email: body.email,
		password: body.password,
		name: body.name,
	});

	if (!result.success) {
		return c.json({ message: "Failed to sign up" }, 400);
	}

	return c.json({ message: "success" });
});

app.post("/api/sign-in", async (c) => {
	const body = await c.req.json();

	const result = await usersModel.signIn({
		email: body.email,
		password: body.password,
	});

	if (!result.success) {
		return c.json({ message: "Failed to sign in" }, 400);
	}

	return c.json(result.value);
});

app.use("/api/auth/*", (c, next) => {
	const jwtMiddleware = jwt({
		secret:
			process.env.JWT_SECRET ??
			"aU2vdTKTBGto9Yh0ElwZGC9QoYDW7Ie7pd0CwqDONgYCFHppa5c6heVgx8CnnAxW9dxkNSVCcat4DyEMGDwq1E20oOF4i9ZCCxgC",
	});

	return jwtMiddleware(c, next);
});

app.use("/api/auth/*", currentUserMiddleware);

app.get("/api/auth/current-user", async (c) => {
	const user = c.get("currentUser");

	return c.json({
		user: {
			id: user.id,
			email: user.email,
			name: user.name ?? undefined,
		},
	});
});

app.get("/api/auth/meetings", async (c) => {
	const meetings = await meetingsModel.findAllActive();

	return c.json(meetings);
});

app.post("/api/auth/meetings", async (c) => {
	const body = await c.req.json();

	const result = await meetingsModel.create({
		name: body.name,
		userId: c.get("currentUser").id,
	});

	if (!result.success) {
		return c.json({ message: "Failed to create meeting" }, 400);
	}

	return c.json(result.value);
});

app.get("/api/auth/meetings/:uuid", async (c) => {
	const meetingUuid = c.req.param("uuid");

	const meeting = await meetingsModel.find(meetingUuid);

	return c.json(meeting);
});

app.post("/api/auth/meetings/:uuid/attend", async (c) => {
	const meetingUuid = c.req.param("uuid");

	const result = await meetingsModel.attend({
		uuid: meetingUuid,
		userId: c.get("currentUser").id,
	});

	if (!result.success) {
		return c.json({ message: "Failed to attend meeting" }, 400);
	}

	return c.json(result.value);
});

app.post("/api/auth/meetings/:uuid/leave", async (c) => {
	const meetingUuid = c.req.param("uuid");

	const result = await meetingsModel.leave({
		uuid: meetingUuid,
		userId: c.get("currentUser").id,
	});

	if (!result.success) {
		return c.json({ message: "Failed to leave meeting" }, 400);
	}

	return c.json(result.value);
});

export default app;
