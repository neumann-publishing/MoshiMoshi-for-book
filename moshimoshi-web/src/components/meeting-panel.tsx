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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { RefObject, use, useState } from "react";
import {
	MdOutlineCallEnd,
	MdOutlineScreenShare,
	MdOutlineStopScreenShare,
	MdOutlineVolumeOff,
	MdOutlineVolumeUp,
} from "react-icons/md";
import { Else, If, Then } from "react-if";
import { useLocation, useParams } from "wouter";
import { currentUserAtom, jwtTokenAtom } from "../atoms/current-user";
import { httpClient } from "../libs/http-client";
import { MeetingWithPariticipants } from "../types";
import { MicrophoneButton } from "./microphone-button";
import { MyVideoPanel } from "./my-video-panel";
import { VideoButton } from "./video-button";

export function MeetingPanel({
	meeting,
	setStartMeeting,
	startMeeting,
	videoRef,
	audioTrackRef,
	videoTrackRef,
}: {
	meeting: MeetingWithPariticipants;
	setStartMeeting: (startMeeting: boolean) => void;
	startMeeting: boolean;
	videoRef: RefObject<HTMLVideoElement>;
	audioTrackRef: RefObject<MediaStreamTrack | null>;
	videoTrackRef: RefObject<MediaStreamTrack | null>;
}) {
	const [_, navigate] = useLocation();
	const params = useParams<{ uuid: string }>();
	const [speakerState, setSpeakerState] = useState(true);
	const [screenShareState, setScreenShareState] = useState(true);
	const jwtToken = useAtomValue(jwtTokenAtom);
	const currentUser = useAtomValue(currentUserAtom);
	const queryClient = useQueryClient();

	const { mutate: leaveMeeting, isPending: leaveMeetingIsPending } =
		useMutation({
			mutationFn: () => {
				return httpClient({ jwtToken })
					.post(`auth/meetings/${params.uuid}/leave`)
					.json();
			},
			onSuccess: () => {
				setStartMeeting(false);
				queryClient.invalidateQueries({ queryKey: ["meetings", params.uuid] });
				navigate("/");
			},
			onError: () => {
				console.error("Failed to leave meeting");
				alert("Failed to leave meeting");
			},
		});

	const closeMeeting = () => {
		leaveMeeting();
	};

	return (
		<Flex flexDirection="column" width="100%" bg="dimgray" height="100vh">
			<Flex width="100%" bg="black" padding="0.5rem">
				<Heading as="h1" size="md" color="white">
					{meeting.name}
				</Heading>
			</Flex>
			<Flex
				width="100%"
				height="100%"
				flexWrap="wrap"
				gap="1rem"
				justifyContent="center"
				alignContent="center"
			>
				{/* TODO currentUser は order 1 にしたい */}
				{/* TODO 画面に表示できないくらいの参加者がいるならそもそも全員は表示できないので、上限以上は縮小表示したい */}
				{meeting.participants.map((participant) => (
					<If condition={participant.userId === currentUser.id}>
						<Then>
							<Flex
								key={participant.userId}
								as="div"
								bg="yellow"
								width="460px"
								height="350px"
								flexDirection="column"
							>
								<MyVideoPanel videoRef={videoRef} />
							</Flex>
						</Then>
						<Else>
							<Flex
								key={participant.userId}
								as="div"
								bg="yellow"
								width="460px"
								height="350px"
								flexDirection="column"
							>
								<Flex justifyContent="flex-end">
									{participant.userName || participant.userEmail}
								</Flex>
								<Flex
									justifyContent="center"
									alignItems="center"
									width="100%"
									height="100%"
								>
									<Avatar
										name={participant.userName || participant.userEmail}
										size="lg"
									/>
								</Flex>
							</Flex>
						</Else>
					</If>
				))}
			</Flex>
			<Flex
				width="100%"
				bg="black"
				padding="1rem"
				justifyContent="center"
				gap="1rem"
			>
				<MicrophoneButton audioTrackRef={audioTrackRef} />
				<VideoButton videoTrackRef={videoTrackRef} />

				<If condition={speakerState}>
					<Then>
						<IconButton
							isRound={true}
							variant="solid"
							aria-label="Speaker Off"
							fontSize="20px"
							onClick={() => setSpeakerState(false)}
							icon={<Icon as={MdOutlineVolumeUp} />}
						/>
					</Then>
					<Else>
						<IconButton
							isRound={true}
							variant="solid"
							aria-label="Speaker On"
							fontSize="20px"
							colorScheme="red"
							onClick={() => setSpeakerState(true)}
							icon={<Icon as={MdOutlineVolumeOff} />}
						/>
					</Else>
				</If>

				<If condition={screenShareState}>
					<Then>
						<IconButton
							isRound={true}
							variant="solid"
							aria-label="Screen Share"
							fontSize="20px"
							onClick={() => setScreenShareState(false)}
							icon={<Icon as={MdOutlineScreenShare} />}
						/>
					</Then>
					<Else>
						<IconButton
							isRound={true}
							variant="solid"
							aria-label="Screen Share"
							fontSize="20px"
							colorScheme="red"
							onClick={() => setScreenShareState(true)}
							icon={<Icon as={MdOutlineStopScreenShare} />}
						/>
					</Else>
				</If>

				<IconButton
					isRound={true}
					variant="solid"
					colorScheme="red"
					aria-label="Close"
					fontSize="20px"
					onClick={() => closeMeeting()}
					isLoading={leaveMeetingIsPending}
					icon={<Icon as={MdOutlineCallEnd} />}
				/>
			</Flex>
		</Flex>
	);
}
