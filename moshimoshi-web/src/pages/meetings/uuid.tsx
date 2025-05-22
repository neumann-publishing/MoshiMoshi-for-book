import {
	Avatar,
	Box,
	Button,
	Flex,
	Heading,
	Icon,
	IconButton,
	Skeleton,
	Tag,
	Text,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { MdArrowBackIos } from "react-icons/md";
import { When } from "react-if";
import { useParams } from "wouter";
import { currentUserAtom, jwtTokenAtom } from "../../atoms/current-user";
import {
	currentAudioDeviceIdAtom,
	currentVideoDeviceIdAtom,
	enableBackgroundBlurAtom,
	enableNoiseCancellationAtom,
	microphoneVolumeAtom,
	microphoneVolumeSizeAtom,
} from "../../atoms/media";
import { MeetingPanel } from "../../components/meeting-panel";
import { MicrophoneButton } from "../../components/microphone-button";
import { MyVideoPanel } from "../../components/my-video-panel";
import { VideoButton } from "../../components/video-button";
import { httpClient } from "../../libs/http-client";
import { mediaDecorator, stopMedia } from "../../libs/media-decorator";
import type { MeetingWithPariticipants } from "../../types";

export function MeetingsUuidPage() {
	const jwtToken = useAtomValue(jwtTokenAtom);
	const currentUser = useAtomValue(currentUserAtom);
	const params = useParams<{ uuid: string }>();
	const [startMeeting, setStartMeeting] = useState(false);

	const videoRef = useRef<HTMLVideoElement>(null);
	const audioTrackRef = useRef<MediaStreamTrack | null>(null);
	const videoTrackRef = useRef<MediaStreamTrack | null>(null);
	const setMicrophoneVolume = useSetAtom(microphoneVolumeAtom);
	const setMicrophoneVolumeSize = useSetAtom(microphoneVolumeSizeAtom);
	const enableNoiseCancellation = useAtomValue(enableNoiseCancellationAtom);
	const currentAudioDeviceId = useAtomValue(currentAudioDeviceIdAtom);
	const currentVideoDeviceId = useAtomValue(currentVideoDeviceIdAtom);
	const enableBackgroundBlur = useAtomValue(enableBackgroundBlurAtom);

	const { data: meeting, isLoading } = useQuery<MeetingWithPariticipants>({
		queryKey: ["meetings", params.uuid],
		queryFn: () => {
			return httpClient({ jwtToken })
				.get(`auth/meetings/${params.uuid}`)
				.json();
		},
	});

	const onAttend = async () => {
		setStartMeeting(true);
	};

	const onBackToHome = () => {
		window.location.href = "/";
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

	// biome-ignore lint/correctness/useExhaustiveDependencies(setMicrophoneVolume): it's a just setter
	// biome-ignore lint/correctness/useExhaustiveDependencies(setMicrophoneVolumeSize): it's a just setter
	// biome-ignore lint/correctness/useExhaustiveDependencies(videoRef.current): <explanation>
	useEffect(() => {
		if (videoRef.current) {
			mediaDecorator({
				videoRef,
				audioTrackRef,
				videoTrackRef,
				currentVideoDeviceId,
				currentAudioDeviceId,
				enableNoiseCancellation,
				enableBackgroundBlur,
				setMicrophoneVolume,
				setMicrophoneVolumeSize,
			});
		}
	}, [
		enableNoiseCancellation,
		currentAudioDeviceId,
		currentVideoDeviceId,
		enableBackgroundBlur,
		videoRef.current,
	]);

	useEffect(() => {
		return () => {
			stopMedia({
				videoTrackRef,
				audioTrackRef,
			});
		};
	}, []);

	if (meeting == null || isLoading) {
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
				<Flex
					width="100%"
					maxWidth="500px"
					justifyContent="space-between"
					alignItems="center"
				>
					<IconButton
						aria-label="back"
						onClick={onBackToHome}
						icon={<Icon as={MdArrowBackIos} />}
					/>
					<Heading as="h1" size="lg">
						MoshiMoshi
					</Heading>
					<Box />
				</Flex>

				<Flex
					width="100%"
					maxWidth="500px"
					justifyContent="center"
					alignItems="center"
				>
					<Heading as="h2" size="lg">
						{meeting.name}
					</Heading>
				</Flex>

				<Flex
					width="100%"
					maxWidth="500px"
					padding="0 1rem"
					flexDirection="column"
					gap="0.5rem"
				>
					<Heading as="h3" size="md">
						参加者
					</Heading>
					{meeting.participants.map((participant) => (
						<Flex key={participant.userId} gap="0.5rem" alignItems="center">
							<Avatar name={participant.userName} size="sm" />
							<Text>{participant.userName}</Text>
							<When condition={participant.isOwner}>
								<Tag colorScheme="orange">オーナー</Tag>
							</When>
						</Flex>
					))}
				</Flex>

				<Flex
					flexDirection="column"
					width="100%"
					maxWidth="500px"
					justifyContent="center"
					alignItems="center"
					marginTop="0.5rem"
					bgColor="dimgray"
					padding="20px"
					borderRadius="10px"
				>
					<MyVideoPanel videoRef={videoRef} />
					<Flex
						gap="0.5rem"
						justifyContent="center"
						alignItems="center"
						bgColor="black"
						width="100%"
						padding="5px"
					>
						<MicrophoneButton audioTrackRef={audioTrackRef} />
						<VideoButton videoTrackRef={videoTrackRef} />
					</Flex>
				</Flex>

				<Flex gap="0.5rem" justifyContent="center">
					<Button type="button" colorScheme="blue" onClick={onAttend}>
						参加する
					</Button>
					<Button type="button" onClick={onBackToHome}>
						戻る
					</Button>
				</Flex>
			</Flex>
		);
	}

	return <MeetingPanel meeting={meeting} setStartMeeting={setStartMeeting} />;
}
