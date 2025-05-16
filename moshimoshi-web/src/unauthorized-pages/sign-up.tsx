import {
	Button,
	Flex,
	FormControl,
	FormLabel,
	Heading,
	Input,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { Link as WouterLink, useLocation } from "wouter";
import { httpClient } from "../libs/http-client";

export function SignUpPage() {
	const [_, navigate] = useLocation();
	const { mutate, isPending } = useMutation({
		mutationFn: (data: { email: string; password: string; name: string }) => {
			return httpClient().post("sign-up", { json: data });
		},
		onSuccess: () => {
			navigate("/");
		},
		onError: (error) => {
			console.error(error);
			alert("Failed to sign up");
		},
	});

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const email = formData.get("email") as string;
		const password = formData.get("password") as string;
		const name = formData.get("name") as string;

		mutate({ email, password, name });
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
						新規登録
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
						<FormControl>
							<FormLabel>お名前</FormLabel>
							<Input type="text" name="name" maxLength={100} />
						</FormControl>
						<Flex marginTop="10px" justifyContent="space-between">
							<Button type="submit" colorScheme="teal" isDisabled={isPending}>
								新規登録
							</Button>
							<WouterLink to="/" asChild>
								<Button type="button">サインイン</Button>
							</WouterLink>
						</Flex>
					</form>
				</Flex>
			</Flex>
		</Flex>
	);
}
