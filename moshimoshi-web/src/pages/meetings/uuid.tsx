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
import { VirtualBackgroundProcessor } from "@shiguredo/virtual-background";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { MeetingWithPariticipants } from "../../types";

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
	const currentVideDeviceId = useAtomValue(currentVideoDeviceIdAtom);
	const enableBackgroundBlur = useAtomValue(enableBackgroundBlurAtom);

	const assetsPath =
		"https://cdn.jsdelivr.net/npm/@shiguredo/virtual-background@latest/dist";
	const virtualBackgroundProcessor = new VirtualBackgroundProcessor(assetsPath);

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

	// TODO deviceId を切り替えたときに画面がちらつく問題を解決したい
	// biome-ignore lint/correctness/useExhaustiveDependencies: run after render video
	useEffect(() => {
		if (videoRef.current) {
			navigator.mediaDevices
				.getUserMedia({
					video: {
						deviceId: currentVideDeviceId
							? { exact: currentVideDeviceId }
							: undefined,
					},
					audio: {
						deviceId: currentAudioDeviceId
							? { exact: currentAudioDeviceId }
							: undefined,
						noiseSuppression: enableNoiseCancellation,
						echoCancellation: enableNoiseCancellation,
						autoGainControl: enableNoiseCancellation,
					},
				})
				.then((stream) => {
					videoRef.current.srcObject = stream;

					const audioContext = new AudioContext();
					const source = audioContext.createMediaStreamSource(stream);
					const analyser = audioContext.createAnalyser();
					analyser.fftSize = 256;
					const dataArray = new Uint8Array(analyser.frequencyBinCount);
					source.connect(analyser);

					setMicrophoneVolumeSize(analyser.frequencyBinCount);

					audioTrackRef.current = stream.getAudioTracks()[0];
					const videoTrack = stream.getVideoTracks()[0];
					videoTrackRef.current = videoTrack;

					const checkAudioInput = () => {
						analyser.getByteFrequencyData(dataArray);
						const volume = dataArray.reduce((a, b) => a + b) / dataArray.length;
						setMicrophoneVolume(volume);
						requestAnimationFrame(checkAudioInput);
					};
					checkAudioInput();

					if (enableBackgroundBlur) {
						const options = {
							blurRadius: 15,
						};
						virtualBackgroundProcessor
							.startProcessing(videoTrack, options)
							.then((processedTrack) => {
								videoRef.current.srcObject = new MediaStream([processedTrack]);
							});
					}
				})
				.catch((error) => {
					console.error("Error accessing media devices.", error);
				});
		}
	}, [
		videoRef.current,
		enableNoiseCancellation,
		currentAudioDeviceId,
		currentVideDeviceId,
		enableBackgroundBlur,
	]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: distraction
	useEffect(() => {
		return () => {
			virtualBackgroundProcessor.stopProcessing();
			if (videoTrackRef.current) {
				videoTrackRef.current.stop();
			}
			if (audioTrackRef.current) {
				audioTrackRef.current.stop();
			}
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
				<Flex width="500px" justifyContent="space-between" alignItems="center">
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

				<Flex width="500px" justifyContent="center" alignItems="center">
					<Heading as="h2" size="lg">
						{meeting.name}
					</Heading>
				</Flex>

				<Flex width="400px" flexDirection="column" gap="0.5rem">
					<Heading as="h3" size="md">
						参加者
					</Heading>
					{meeting.participants.map((participant) => (
						<Flex key={participant.userId} gap="0.5rem" alignItems="center">
							<Avatar
								name={participant.userName || participant.userEmail}
								size="sm"
							/>
							<Text>{participant.userName || participant.userEmail}</Text>
							<When condition={participant.isOwner}>
								<Tag colorScheme="orange">オーナー</Tag>
							</When>
						</Flex>
					))}
				</Flex>

				<Flex
					flexDirection="column"
					width="500px"
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
					<Button
						type="button"
						colorScheme="blue"
						onClick={onAttend}
						isLoading={isPending}
					>
						参加する
					</Button>
					<Button type="button" onClick={onBackToHome}>
						戻る
					</Button>
				</Flex>
			</Flex>
		);
	}

	return (
		<MeetingPanel
			meeting={meeting}
			setStartMeeting={setStartMeeting}
			startMeeting={startMeeting}
			videoRef={videoRef}
			audioTrackRef={audioTrackRef}
			videoTrackRef={videoTrackRef}
		/>
	);
}
