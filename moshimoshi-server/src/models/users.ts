import bcrypt from "bcryptjs";
import dayjs from "dayjs";
import "dotenv/config";
import { sign } from "hono/jwt";
import type { Insertable } from "kysely";
import * as v from "valibot";
import type { Users } from "../db/db.d.ts";
import { db } from "../db/index.js";
import { notFoundError, uniqueValidationError } from "../libs/validator.js";
import type { ModelResponse } from "../types.d.ts";

const SignUpSchema = v.object({
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8), v.maxLength(50)),
	name: v.nullable(v.pipe(v.string(), v.maxLength(100))),
});
type SignUpParams = v.InferOutput<typeof SignUpSchema>;
export async function signUp(
	params: SignUpParams,
): Promise<ModelResponse<Insertable<Users>>> {
	const validationResult = v.safeParse(SignUpSchema, params);

	if (!validationResult.success) {
		return { success: false, value: validationResult.issues };
	}

	const salt = await bcrypt.genSalt(15);
	const passwordDigest = await bcrypt.hash(params.password, salt);

	return await db.transaction().execute(async (trx) => {
		const existedUser = await trx
			.selectFrom("users")
			.select("id")
			.where("email", "=", params.email)
			.executeTakeFirst();

		if (existedUser) {
			return {
				success: false,
				value: [uniqueValidationError("email")],
			};
		}

		const user = await trx
			.insertInto("users")
			.values({ email: params.email, name: params.name, passwordDigest })
			.returningAll()
			.executeTakeFirst();

		return {
			success: true,
			value: user,
		};
	});
}

const SignInSchema = v.object({
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8), v.maxLength(50)),
});
type SignInParams = v.InferOutput<typeof SignInSchema>;
type SignInResponse = {
	jwtToken: string;
	user: {
		id: number;
		email: string;
		name?: string;
	};
};
export async function signIn(
	params: SignInParams,
): Promise<ModelResponse<SignInResponse>> {
	const validationResult = v.safeParse(SignInSchema, params);

	if (!validationResult.success) {
		return { success: false, value: validationResult.issues };
	}

	const user = await db
		.selectFrom("users")
		.selectAll()
		.where("email", "=", params.email)
		.executeTakeFirst();

	if (!user) {
		return {
			success: false,
			value: [notFoundError("email")],
		};
	}

	const passwordMatch = await bcrypt.compare(
		params.password,
		user.passwordDigest,
	);

	if (!passwordMatch) {
		return {
			success: false,
			value: [
				{
					path: "password",
					expected: "match",
					value: "Password does not match",
				},
			],
		};
	}

	// JWT token generation
	const payload = {
		sub: user.id,
		exp: dayjs().add(1, "day").unix(),
	};

	const jwtToken = await sign(
		payload,
		process.env.JWT_SECRET ??
			"aU2vdTKTBGto9Yh0ElwZGC9QoYDW7Ie7pd0CwqDONgYCFHppa5c6heVgx8CnnAxW9dxkNSVCcat4DyEMGDwq1E20oOF4i9ZCCxgC",
	);

	return {
		success: true,
		value: {
			jwtToken: jwtToken,
			user: {
				id: user.id,
				email: user.email,
				name: user.name || undefined,
			},
		},
	};
}

export async function find(id: number) {
	return await db
		.selectFrom("users")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();
}
