import {
	Avatar,
	Box,
	Button,
	Flex,
	Heading,
	Icon,
	IconButton,
	Skeleton,
	Tooltip,
} from "@chakra-ui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { MdArrowBackIos } from "react-icons/md";
import { useParams } from "wouter";
import { Link as WouterLink } from "wouter";
import { currentUserAtom, jwtTokenAtom } from "../../atoms/current-user";
import { MeetingPanel } from "../../components/meeting-panel";
import { httpClient } from "../../libs/http-client";
import { MeetingWithPariticipants } from "../../types";

export function MeetingsUuidPage() {
	const jwtToken = useAtomValue(jwtTokenAtom);
	const currentUser = useAtomValue(currentUserAtom);
	const params = useParams<{ uuid: string }>();
	const [startMeeting, setStartMeeting] = useState(false);

	const {
		data: meeting,
		isLoading,
		refetch,
	} = useQuery<MeetingWithPariticipants>({
		queryKey: ["meetings", params.uuid],
		queryFn: () => {
			return httpClient({ jwtToken })
				.get(`auth/meetings/${params.uuid}`)
				.json();
		},
	});
	const owner = useMemo(
		() => meeting?.participants?.find((p) => p.isOwner),
		[meeting],
	);

	const { mutate, isPending } = useMutation<{
		message: string;
		already: boolean;
	}>({
		mutationFn: () => {
			return httpClient({ jwtToken })
				.post(`auth/meetings/${params.uuid}/attend`)
				.json();
		},
		onSuccess: async (body) => {
			if (!body.already) {
				// 会話に初参加したケース
				await refetch();
			} else {
				// すでに会話に参加しているケース
			}
		},
		onError: () => {},
	});

	const onAttend = async () => {
		mutate();
		setStartMeeting(true);
	};

	useEffect(() => {
		if (meeting == null) {
			return;
		}

		const attended = meeting.participants.find(
			(p) => p.userId === currentUser.id,
		);
		if (attended != null) {
			setStartMeeting(true);
		}
	}, [meeting, currentUser]);

	if (meeting == null || owner == null || isLoading) {
		return (
			<Flex
				width="100%"
				justifyContent="center"
				alignItems="center"
				flexDirection="column"
			>
				<Flex width="500px" justifyContent="center" alignItems="center">
					<Heading as="h1" size="lg">
						MoshiMoshi
					</Heading>
					<Skeleton height="5rem" />
				</Flex>
			</Flex>
		);
	}

	if (!startMeeting) {
		return (
			<Flex
				width="100%"
				justifyContent="center"
				alignItems="center"
				flexDirection="column"
			>
				<Flex width="500px" justifyContent="center" alignItems="center">
					<Heading as="h1" size="lg">
						MoshiMoshi
					</Heading>
				</Flex>

				<Flex width="500px" justifyContent="space-between" alignItems="center">
					<WouterLink href="/" asChild>
						<IconButton aria-label="back" icon={<Icon as={MdArrowBackIos} />} />
					</WouterLink>
					<Heading as="h2" size="lg">
						{meeting.name}
					</Heading>
					<Tooltip label={owner.userName || owner.userEmail} aria-label="owner">
						<Avatar name={owner.userName || owner.userEmail} size="sm" />
					</Tooltip>
				</Flex>

				<Flex
					flexDirection="column"
					width="500px"
					justifyContent="center"
					alignItems="center"
					gap="0.5rem"
					marginTop="0.5rem"
				>
					<Box bg="yellow" width="400px" height="300px">
						video
					</Box>
					<Flex gap="0.5rem" justifyContent="center">
						<Button
							type="button"
							colorScheme="blue"
							onClick={onAttend}
							isLoading={isPending}
						>
							参加する
						</Button>
						<WouterLink href="/" asChild>
							<Button type="button">戻る</Button>
						</WouterLink>
					</Flex>
				</Flex>
			</Flex>
		);
	}

	return (
		<MeetingPanel
			meeting={meeting}
			setStartMeeting={setStartMeeting}
			startMeeting={startMeeting}
		/>
	);
}
