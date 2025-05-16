import { Button, Flex, Input } from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { jwtTokenAtom } from "../atoms/current-user";
import { httpClient } from "../libs/http-client";

export function CreateMeetingForm({
	defaultValues,
	afterSubmit,
}: { defaultValues?: { name: string }; afterSubmit?: () => void }) {
	const jwtToken = useAtomValue(jwtTokenAtom);
	const queryClient = useQueryClient();
	const { mutate, isPending } = useMutation({
		mutationFn: (data: { name: string }) => {
			return httpClient({ jwtToken }).post("auth/meetings", { json: data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["meetings"] });
			afterSubmit();
		},
		onError: (error) => {
			console.error(error);
			alert("Failed to create a meeting");
		},
	});

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const formData = new FormData(event.currentTarget);
		const name = formData.get("name") as string;

		mutate({ name });
	};

	return (
		<form onSubmit={onSubmit}>
			<Flex>
				<Input
					placeholder="タイトル"
					name="name"
					defaultValue={defaultValues.name}
				/>
				<Button type="submit" isDisabled={isPending} colorScheme="teal">
					作成
				</Button>
			</Flex>
		</form>
	);
}
