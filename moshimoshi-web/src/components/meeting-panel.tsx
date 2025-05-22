import { Flex, Heading, Icon, IconButton } from "@chakra-ui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAtomValue, useSetAtom } from "jotai";
import * as mediasoupClient from "mediasoup-client";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
	MdOutlineCallEnd,
	MdOutlineScreenShare,
	MdOutlineStopScreenShare,
	MdOutlineVolumeOff,
	MdOutlineVolumeUp,
} from "react-icons/md";
import { Else, If, Then } from "react-if";
import io from "socket.io-client";
import { useLocation, useParams } from "wouter";
import { currentUserAtom, jwtTokenAtom } from "../atoms/current-user";
import {
	currentAudioDeviceIdAtom,
	currentVideoDeviceIdAtom,
	enableBackgroundBlurAtom,
	enableNoiseCancellationAtom,
	microphoneVolumeAtom,
	microphoneVolumeSizeAtom,
} from "../atoms/media";
import { httpClient } from "../libs/http-client";
import { mediaDecorator, stopMedia } from "../libs/media-decorator";
import type { MeetingWithPariticipants } from "../types";
import type {
	ConsumeResponse,
	MediasoupSocket,
	ParticipantInfo,
	TransportParameters,
} from "../types/mediasoup";
import { MicrophoneButton } from "./microphone-button";
import { MyVideoPanel } from "./my-video-panel";
import { VideoButton } from "./video-button";
import { VideoPanel } from "./video-panel";

// 参加者ストリーム情報の型定義
interface ParticipantStream {
	userId: string;
	userName: string;
	videoStream?: MediaStream;
	audioStream?: MediaStream;
}

// 参加者ビデオコンポーネントの型定義
interface ParticipantVideoProps {
	participant: ParticipantStream;
	speakerState: boolean;
}

// 動的に生成される参加者ビデオコンポーネント
const ParticipantVideo = memo(
	({ participant, speakerState }: ParticipantVideoProps) => {
		const videoRef = useRef<HTMLVideoElement>(null);
		const audioRef = useRef<HTMLAudioElement>(null);
		const [videoElementReady, setVideoElementReady] = useState(false);
		const [audioElementReady, setAudioElementReady] = useState(false);
		const retryCountRef = useRef<Record<string, number>>({
			video: 0,
			audio: 0,
		});

		// videoRefとaudioRefが初期化されたことを検知
		useEffect(() => {
			if (videoRef.current) {
				setVideoElementReady(true);
			}
			if (audioRef.current) {
				setAudioElementReady(true);
			}
		}, []);

		// ビデオストリームが変更されたら再生
		useEffect(() => {
			if (!participant.videoStream || !videoElementReady) return;

			let mounted = true;

			const setupVideo = async () => {
				try {
					if (!videoRef.current || !mounted) return;

					// 現在のストリームをクリーンアップ
					if (videoRef.current.srcObject) {
						try {
							const tracks = (
								videoRef.current.srcObject as MediaStream
							).getTracks();
							tracks.forEach((track) => track.stop());
						} catch (e) {
							console.warn("Error cleaning up previous video tracks:", e);
						}
						videoRef.current.srcObject = null;
					}

					// 少し遅延を入れる
					await new Promise((resolve) => setTimeout(resolve, 200));
					if (!videoRef.current || !mounted) return;

					// 新しいストリームを設定
					videoRef.current.srcObject = participant.videoStream;

					const playVideo = async () => {
						if (!videoRef.current || !mounted) return;

						try {
							await videoRef.current.play();
							console.log(
								`Successfully playing video for ${participant.userName}`,
							);
							retryCountRef.current.video = 0; // リトライカウンターをリセット
						} catch (error) {
							if (
								error instanceof DOMException &&
								error.name === "AbortError"
							) {
								// AbortErrorの場合のみリトライ、最大5回まで
								if (retryCountRef.current.video < 5) {
									retryCountRef.current.video++;
									console.warn(
										`Video play aborted for ${participant.userName}, retrying... (${retryCountRef.current.video}/5)`,
									);
									await new Promise((resolve) => setTimeout(resolve, 1000));
									if (mounted) {
										playVideo();
									}
								} else {
									console.error(
										`Max retries reached for ${participant.userName} video playback`,
									);
								}
							} else {
								console.error(
									`Failed to play video for ${participant.userName}:`,
									error,
								);
							}
						}
					};

					playVideo();
				} catch (error) {
					console.error(
						`Error setting up video for ${participant.userName}:`,
						error,
					);
				}
			};

			setupVideo();

			return () => {
				mounted = false;
			};
		}, [participant.videoStream, participant.userName, videoElementReady]);

		// オーディオストリームが変更されたら再生
		useEffect(() => {
			if (!participant.audioStream || !audioElementReady) return;

			let mounted = true;

			const setupAudio = async () => {
				try {
					if (!audioRef.current || !mounted) return;

					// 現在のストリームをクリーンアップ
					if (audioRef.current.srcObject) {
						try {
							const tracks = (
								audioRef.current.srcObject as MediaStream
							).getTracks();
							tracks.forEach((track) => track.stop());
						} catch (e) {
							console.warn("Error cleaning up previous audio tracks:", e);
						}
						audioRef.current.srcObject = null;
					}

					// 少し遅延を入れる
					await new Promise((resolve) => setTimeout(resolve, 300));
					if (!audioRef.current || !mounted) return;

					// 新しいストリームを設定
					audioRef.current.srcObject = participant.audioStream;
					audioRef.current.muted = !speakerState;

					const playAudio = async () => {
						if (!audioRef.current || !mounted) return;

						try {
							await audioRef.current.play();
							console.log(
								`Successfully playing audio for ${participant.userName}`,
							);
							retryCountRef.current.audio = 0; // リトライカウンターをリセット
						} catch (error) {
							// ユーザーインタラクションが必要な場合
							if (
								error instanceof DOMException &&
								error.name === "NotAllowedError"
							) {
								console.warn(
									`Audio autoplay blocked for ${participant.userName}, will retry on user interaction`,
								);
								// ユーザーインタラクション後に自動的に再生を試みる
								const resumePlayback = () => {
									if (audioRef.current && mounted) {
										audioRef.current
											.play()
											.catch((e) =>
												console.warn("Error resuming audio on interaction:", e),
											);
									}
									document.removeEventListener("click", resumePlayback);
								};
								document.addEventListener("click", resumePlayback, {
									once: true,
								});
							} else if (
								error instanceof DOMException &&
								error.name === "AbortError"
							) {
								// AbortErrorの場合のみリトライ、最大5回まで
								if (retryCountRef.current.audio < 5) {
									retryCountRef.current.audio++;
									console.warn(
										`Audio play aborted for ${participant.userName}, retrying... (${retryCountRef.current.audio}/5)`,
									);
									await new Promise((resolve) => setTimeout(resolve, 1000));
									if (mounted) {
										playAudio();
									}
								} else {
									console.error(
										`Max retries reached for ${participant.userName} audio playback`,
									);
								}
							} else {
								console.error(
									`Failed to play audio for ${participant.userName}:`,
									error,
								);
							}
						}
					};

					playAudio();
				} catch (error) {
					console.error(
						`Error setting up audio for ${participant.userName}:`,
						error,
					);
				}
			};

			setupAudio();

			return () => {
				mounted = false;
			};
		}, [
			participant.audioStream,
			participant.userName,
			speakerState,
			audioElementReady,
		]);

		// スピーカー状態が変更されたらミュート状態を更新
		useEffect(() => {
			if (audioRef.current) {
				audioRef.current.muted = !speakerState;
			}
		}, [speakerState]);

		return (
			<Flex
				as="div"
				bg="gray"
				width="230px"
				height="175px"
				flexDirection="column"
				position="relative"
			>
				<VideoPanel
					videoRef={videoRef}
					enableVideo={!!participant.videoStream}
					userName={participant.userName}
					soundVolume={participant.audioStream && !speakerState ? 0 : 30}
				/>

				{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
				<audio
					ref={audioRef}
					autoPlay={false} // autoPlayをfalseに設定して明示的に制御する
					muted={!speakerState}
					controls={false}
					style={{ display: "none" }}
				/>

				{/* ミュート状態を視覚的に表示 */}
				{!speakerState && (
					<Icon
						as={MdOutlineVolumeOff}
						position="absolute"
						top="5px"
						right="5px"
						color="red.500"
						bg="rgba(0,0,0,0.5)"
						borderRadius="full"
						p="1"
						boxSize="24px"
					/>
				)}
			</Flex>
		);
	},
);

export function MeetingPanel({
	meeting,
	setStartMeeting,
}: {
	meeting: MeetingWithPariticipants;
	setStartMeeting: (startMeeting: boolean) => void;
}) {
	const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || "http://localhost:3002";

	const [_, navigate] = useLocation();
	const params = useParams<{ uuid: string }>();
	const [speakerState, setSpeakerState] = useState(true);
	const [screenShareState, setScreenShareState] = useState(true);
	const jwtToken = useAtomValue(jwtTokenAtom);
	const currentUser = useAtomValue(currentUserAtom);
	const queryClient = useQueryClient();

	const [participants, setParticipants] = useState(meeting.participants);
	const otherParticipants = useMemo(() => {
		return participants.filter((p) => p.userId !== currentUser.id);
	}, [participants, currentUser.id]);

	// 参加者のストリーム情報を管理
	const [participantStreams, setParticipantStreams] = useState<
		Record<string, ParticipantStream>
	>({});

	const videoRef = useRef<HTMLVideoElement>(null);
	const audioTrackRef = useRef<MediaStreamTrack | null>(null);
	const videoTrackRef = useRef<MediaStreamTrack | null>(null);
	const setMicrophoneVolume = useSetAtom(microphoneVolumeAtom);
	const setMicrophoneVolumeSize = useSetAtom(microphoneVolumeSizeAtom);
	const enableNoiseCancellation = useAtomValue(enableNoiseCancellationAtom);
	const currentAudioDeviceId = useAtomValue(currentAudioDeviceIdAtom);
	const currentVideoDeviceId = useAtomValue(currentVideoDeviceIdAtom);
	const enableBackgroundBlur = useAtomValue(enableBackgroundBlurAtom);

	// WebSocket接続用の参照
	const socketRef = useRef<MediasoupSocket | null>(null);

	// ミーティング退出処理
	const [isLeavingMeeting, setIsLeavingMeeting] = useState(false);

	const closeMeeting = () => {
		setIsLeavingMeeting(true);

		// WebSocketで退出処理
		if (socketRef.current) {
			socketRef.current.emit(
				"leaveMeeting",
				{ meetingUuid: meeting.uuid },
				(result) => {
					if (result.success) {
						console.log("Successfully left the meeting");
						setStartMeeting(false);
						queryClient.invalidateQueries({
							queryKey: ["meetings", params.uuid],
						});
						window.location.href = "/";
					} else {
						console.error("Failed to leave meeting:", result.message);
						alert("会議の退出に失敗しました。");
						setIsLeavingMeeting(false);
					}
				},
			);
		} else {
			console.error("Socket connection not available");
			alert("WebSocket接続が利用できません。ページをリロードしてください。");
			setIsLeavingMeeting(false);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies:
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (
			jwtToken == null ||
			videoRef.current == null ||
			audioTrackRef.current == null ||
			videoTrackRef.current == null
		) {
			return;
		}

		// 参加者のストリームを設定するヘルパー関数
		const setupConsumerForParticipant = async (
			participant: ParticipantInfo,
			device: mediasoupClient.Device,
			socket: MediasoupSocket,
			speakerEnabled: boolean,
		) => {
			// producerIdがない場合は無視
			if (!participant.producerId) {
				console.log(
					`Participant ${participant.userName} has no producer ID yet`,
				);
				return;
			}

			// サーバーに受信用Transport作成をリクエスト
			socket.emit(
				"createWebRtcTransport",
				{ direction: "recv" },
				async (params: TransportParameters) => {
					// Check for error
					if (params.error) {
						console.error("Failed to create receive transport:", params.error);
						return;
					}

					const recvTransport = device.createRecvTransport(params);

					recvTransport.on(
						"connect",
						({ dtlsParameters }, callback, _errback) => {
							socket.emit(
								"connectTransport",
								{ transportId: recvTransport.id, dtlsParameters },
								callback,
							);
						},
					);

					// サーバーにconsumeリクエスト
					socket.emit(
						"consume",
						{
							transportId: recvTransport.id,
							producerId: participant.producerId,
						},
						async (response: ConsumeResponse) => {
							try {
								const consumer = await recvTransport.consume({
									id: response.id,
									producerId: response.producerId,
									kind: response.kind,
									rtpParameters: response.rtpParameters,
								});

								console.log("Received consumer: ", consumer);
								const stream = new MediaStream([consumer.track]);

								// 既存の参加者ストリーム情報を取得
								setParticipantStreams((prev) => {
									const key = String(participant.userId);
									const existingParticipant = prev[key] || {
										userId: String(participant.userId),
										userName: participant.userName,
										audioStream: undefined,
										videoStream: undefined,
									};

									// 新しいストリームを作成する前に、既存のストリームのトラックを停止
									let updatedParticipant;
									if (response.kind === "video") {
										if (existingParticipant.videoStream) {
											existingParticipant.videoStream
												.getTracks()
												.forEach((track) => track.stop());
										}
										updatedParticipant = {
											...existingParticipant,
											userId: String(participant.userId),
											userName: participant.userName,
											videoStream: stream,
										} as ParticipantStream;
									} else if (response.kind === "audio") {
										if (existingParticipant.audioStream) {
											existingParticipant.audioStream
												.getTracks()
												.forEach((track) => track.stop());
										}
										updatedParticipant = {
											...existingParticipant,
											userId: String(participant.userId),
											userName: participant.userName,
											audioStream: stream,
										} as ParticipantStream;
									} else {
										return prev;
									}

									console.log(
										`Updated participant stream for ${participant.userName}, kind: ${response.kind}`,
									);

									return {
										...prev,
										[key]: updatedParticipant,
									};
								});

								console.log(
									`Received ${response.kind} stream from ${participant.userName}`,
								);

								// オーディオのミュート状態を再設定（必要な場合）
								if (response.kind === "audio") {
									setTimeout(() => {
										const audioElements = document.querySelectorAll("audio");
										audioElements.forEach((audio) => {
											if (audio.srcObject === stream) {
												audio.muted = !speakerEnabled;
											}
										});
									}, 500);
								}
							} catch (error) {
								console.error(
									`Error consuming ${response.kind} from ${participant.userName}:`,
									error,
								);
							}
						},
					);
				},
			);
		};

		// socket.ioでmediasoupサーバーに接続
		const socket = io(wsUrl, {
			transports: ["websocket"],
			auth: { token: jwtToken },
		}) as MediasoupSocket;

		// socketRef に保存して他の場所からも使えるようにする
		socketRef.current = socket;

		// サーバーからRTP Capabilities取得
		socket.emit("getRouterRtpCapabilities", async (rtpCapabilities) => {
			const device = new mediasoupClient.Device();
			await device.load({ routerRtpCapabilities: rtpCapabilities });
			console.log("mediasoup Device loaded", device);

			// 既存の参加者情報を取得
			socket.emit(
				"getParticipants",
				{ meetingUuid: meeting.uuid },
				async (existingParticipants) => {
					console.log("Existing participants:", existingParticipants);

					// 既存の参加者を表示用のstateに設定
					setParticipants((prev) => {
						// 現在の参加者と新しい参加者をマージ
						const updatedParticipants = [...prev];

						existingParticipants.forEach((participant) => {
							// 自分自身は除外
							if (participant.userId === currentUser.id) return;

							// 既存の参加者リストに存在するか確認
							const existingIndex = updatedParticipants.findIndex(
								(p) => p.userId === participant.userId,
							);

							if (existingIndex >= 0) {
								// 更新
								updatedParticipants[existingIndex] = participant;
							} else {
								// 追加
								updatedParticipants.push(participant);
							}
						});

						return updatedParticipants;
					});

					// 既存の参加者のストリームを設定
					for (const existingParticipant of existingParticipants) {
						// 自分自身は除外
						if (existingParticipant.userId === currentUser.id) continue;

						// プロデューサーIDがある場合のみストリームを取得
						if (existingParticipant.producerId) {
							console.log(
								`Setting up stream for existing participant: ${existingParticipant.userName}`,
							);
							await setupConsumerForParticipant(
								existingParticipant,
								device,
								socket,
								speakerState,
							);
						} else {
							console.log(
								`Existing participant ${existingParticipant.userName} has no producer ID yet`,
							);
						}
					}
				},
			);

			// ここでmediasoup送信/受信の初期化を行う
			// サーバーに送信用Transport作成をリクエスト
			socket.emit(
				"createWebRtcTransport",
				{ direction: "send" },
				async (params: TransportParameters) => {
					// Check for error
					if (params.error) {
						console.error("Failed to create transport:", params.error);
						return;
					}
					const sendTransport = device.createSendTransport(params);

					sendTransport.on(
						"connect",
						({ dtlsParameters }, callback, _errback) => {
							socket.emit(
								"connectTransport",
								{ transportId: sendTransport.id, dtlsParameters },
								callback,
							);
						},
					);

					sendTransport.on(
						"produce",
						({ kind, rtpParameters }, callback, _errback) => {
							socket.emit(
								"produce",
								{
									transportId: sendTransport.id,
									kind,
									rtpParameters,
									meetingUuid: meeting.uuid,
								},
								({ producerId }: { producerId: string }) => {
									callback({ id: producerId });
								},
							);
						},
					);

					// 音声Producer
					if (audioTrackRef.current) {
						console.log("audioTrackRef.current", audioTrackRef.current);
						await sendTransport.produce({ track: audioTrackRef.current });
					}
					// 映像Producer
					if (videoTrackRef.current) {
						console.log("videoTrackRef.current", videoTrackRef.current);
						await sendTransport.produce({ track: videoTrackRef.current });
					}
				},
			);

			// 受信Consumer作成の雛形
			socket.on("newProducer", async (participant: ParticipantInfo) => {
				if (participant.meetingUuid !== meeting.uuid) return;

				// 自分自身は除外
				if (participant.userId === currentUser.id) return;

				console.log(`New producer from ${participant.userName}`, participant);

				// 新しい参加者のストリームを設定
				await setupConsumerForParticipant(
					participant,
					device,
					socket,
					speakerState,
				);
			});

			// 接続エラーや切断時の処理
			socket.on("connect_error", (error) => {
				console.error("MediaSoup socket connection error:", error);
			});

			socket.on("disconnect", (reason) => {
				console.warn("MediaSoup socket disconnected:", reason);
				// 再接続のためのロジックを追加することもできる
			});
		});

		// 終了処理
		return () => {
			socket.off("newProducer");
			socket.off("connect_error");
			socket.off("disconnect");
			socket.off("getParticipants"); // 追加した新しいイベントハンドラを削除

			// すべての参加者ストリームをクリーンアップ
			Object.values(participantStreams).forEach((participant) => {
				if (participant.videoStream) {
					participant.videoStream.getTracks().forEach((track) => track.stop());
				}
				if (participant.audioStream) {
					participant.audioStream.getTracks().forEach((track) => track.stop());
				}
			});

			stopMedia({
				videoTrackRef,
				audioTrackRef,
			});

			// ソケット接続を閉じる
			socket.disconnect();
		};
	}, [
		jwtToken,
		videoRef.current,
		audioTrackRef.current,
		videoTrackRef.current,
		meeting.uuid,
		speakerState,
		// participantStreamsは依存配列に入れない - 無限ループになる可能性がある
	]);

	// 参加者のビデオコンポーネントを生成
	const renderParticipantVideos = useMemo(() => {
		return Object.values(participantStreams).map((participant) => (
			<ParticipantVideo
				key={participant.userId}
				participant={participant}
				speakerState={speakerState}
			/>
		));
	}, [participantStreams, speakerState]);

	return (
		<Flex flexDirection="column" width="100%" bg="dimgray" height="100vh">
			<Flex width="100%" bg="black" padding="0.5rem">
				<Heading as="h1" size="md" color="white">
					{meeting.name}
				</Heading>
			</Flex>
			<Flex
				width="100%"
				flex="1"
				flexWrap="wrap"
				gap="1rem"
				justifyContent="center"
				alignContent="center"
			>
				<Flex
					as="div"
					bg="gray"
					width="230px"
					height="175px"
					flexDirection="column"
				>
					<MyVideoPanel videoRef={videoRef} />
				</Flex>

				{/* 他の参加者のビデオと音声を表示 */}
				{renderParticipantVideos}
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
					isLoading={isLeavingMeeting}
					icon={<Icon as={MdOutlineCallEnd} />}
				/>
			</Flex>
		</Flex>
	);
}
