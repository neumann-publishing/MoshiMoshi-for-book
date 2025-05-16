import {
	Box,
	Button,
	Flex,
	FormControl,
	FormLabel,
	Heading,
	Input,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import Cookies from "js-cookie";
import { Link as WouterLink } from "wouter";
import { currentUserAtom, jwtTokenAtom } from "../atoms/current-user";
import { httpClient } from "../libs/http-client";
import { User } from "../types";

export function SignInPage() {
	const setJwtToken = useSetAtom(jwtTokenAtom);
	const setCurrentUser = useSetAtom(currentUserAtom);
	const { mutate, isPending } = useMutation({
		mutationFn: (data: { email: string; password: string }) => {
			return httpClient().post("sign-in", { json: data }).json();
		},
		onSuccess: (body: { jwtToken: string; user: User }) => {
			setJwtToken(body.jwtToken);
			setCurrentUser(body.user);
			Cookies.set("jwt-token", body.jwtToken);
		},
		onError: (error) => {
			console.error(error);
			alert("Failed to sign in");
			setJwtToken(undefined);
			setCurrentUser(undefined);
			Cookies.remove("jwt-token");
		},
	});

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;

		mutate({ email, password });
	};

	return (
		<Flex
			width="100%"
			justifyContent="center"
			alignItems="center"
			flexDirection="column"
		>
			<Flex flex="1" flexDirection="column" width="500px">
				<Heading as="h1" size="2xl">
					MoshiMoshi
				</Heading>
				<Flex
					flexDirection="column"
					border="solid 2px lightgray"
					borderRadius="10px"
					padding="10px"
					margin="10px"
				>
					<Heading as="h2" size="lg">
						サインイン
					</Heading>
					<form onSubmit={onSubmit}>
						<FormControl>
							<FormLabel>メールアドレス</FormLabel>
							<Input type="email" name="email" maxLength={49} required />
						</FormControl>
						<FormControl>
							<FormLabel>パスワード</FormLabel>
							<Input
								type="password"
								name="password"
								required
								maxLength={50}
								minLength={8}
							/>
						</FormControl>
						<Flex marginTop="10px" justifyContent="space-between">
							<Button type="submit" colorScheme="blue" isDisabled={isPending}>
								サインイン
							</Button>
							<WouterLink to="/sign-up" asChild>
								<Button type="button">新規登録</Button>
							</WouterLink>
						</Flex>
					</form>
				</Flex>
			</Flex>
		</Flex>
	);
}
