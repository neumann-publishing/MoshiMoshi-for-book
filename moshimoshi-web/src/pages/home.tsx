import {
	Avatar,
	AvatarGroup,
	Button,
	Flex,
	Heading,
	Icon,
	Link,
	ListItem,
	Skeleton,
	Tooltip,
	UnorderedList,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { MdAdd } from "react-icons/md";
import { When } from "react-if";
import { Else, If, Then } from "react-if";
import { Link as WouterLink } from "wouter";
import { jwtTokenAtom } from "../atoms/current-user";
import { CreateMeetingForm } from "../components/create-meeting-form";
import { SignOutButton } from "../components/sign-out-button";
import { httpClient } from "../libs/http-client";
import type { MeetingWithPariticipants } from "../types";

export function Home() {
	const [showAddMeeting, setShowAddMeeting] = useState(false);
	const jwtToken = useAtomValue(jwtTokenAtom);
	const { data: meetings, isLoading } = useQuery<MeetingWithPariticipants[]>({
		queryKey: ["meetings"],
		queryFn: () => {
			return httpClient({ jwtToken }).get("auth/meetings").json();
		},
	});

	return (
		<Flex
			width="100%"
			justifyContent="center"
			alignItems="center"
			flexDirection="column"
		>
			<Flex
				width="100%"
				maxWidth="500px"
				justifyContent="space-between"
				alignItems="center"
			>
				<Heading as="h1" size="2xl">
					MoshiMoshi
				</Heading>
				<SignOutButton />
			</Flex>
			<Flex width="100%" maxWidth="500px" flexDirection="column">
				<Heading as="h2" size="lg">
					ミーティング一覧
				</Heading>
				<UnorderedList>
					<If condition={isLoading}>
						<Then>
							{" "}
							<ListItem>
								<Skeleton height="2rem" />
							</ListItem>
							<ListItem>
								<Skeleton height="2rem" />
							</ListItem>
							<ListItem>
								<Skeleton height="2rem" />
							</ListItem>
						</Then>
						<Else>
							{meetings?.map((meeting) => (
								<ListItem key={meeting.uuid}>
									<Flex justifyContent="space-between" alignItems="center">
										<WouterLink href={`/meetings/${meeting.uuid}`} asChild>
											<Link>{meeting.name}</Link>
										</WouterLink>
										<AvatarGroup size="sm" max={3}>
											{meeting.participants.map((participant) => (
												<Avatar
													key={participant.userId}
													name={participant.userName}
													size="sm"
												/>
											))}
										</AvatarGroup>
									</Flex>
								</ListItem>
							))}
						</Else>
					</If>
					<When condition={showAddMeeting}>
						<ListItem>
							<CreateMeetingForm
								defaultValues={{ name: "" }}
								afterSubmit={() => setShowAddMeeting(false)}
							/>
						</ListItem>
					</When>
				</UnorderedList>
				<Flex justifyContent="flex-end" marginTop="0.5rem">
					<Button
						leftIcon={<Icon as={MdAdd} />}
						colorScheme="blue"
						onClick={() => setShowAddMeeting(true)}
					>
						追加
					</Button>
				</Flex>
			</Flex>
		</Flex>
	);
}
