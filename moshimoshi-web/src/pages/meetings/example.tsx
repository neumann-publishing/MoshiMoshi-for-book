import { Flex, Radio, RadioGroup, Switch, Text } from "@chakra-ui/react";
import { VirtualBackgroundProcessor } from "@shiguredo/virtual-background";
import { useEffect, useRef, useState } from "react";
import { DeviceType, getDevices } from "../../libs/devices";

export function MeetingsExamplePage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [currentVideoDeviceId, setCurrentVideoDeviceId] =
		useState<string>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [enableBackgroundBlur, setEnableBackgroundBlur] = useState(false);
	const assetsPath =
		"https://cdn.jsdelivr.net/npm/@shiguredo/virtual-background@latest/dist";
	const virtualBackgroundProcessor = new VirtualBackgroundProcessor(assetsPath);

	useEffect(() => {
		const getVideoDevices = async () => {
			const devices = await getDevices(DeviceType.camera);
			setVideoDevices(devices);
			setCurrentVideoDeviceId(devices[0]?.deviceId);
		};
		getVideoDevices();
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: no problem
	useEffect(() => {
		const getMedia = async () => {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					deviceId: currentVideoDeviceId
						? { exact: currentVideoDeviceId }
						: undefined,
				},
				audio: true,
			});
			setStream(stream);
			videoRef.current.srcObject = stream;

			const videoTrack = stream.getVideoTracks()[0];
			if (enableBackgroundBlur) {
				const options = {
					blurRadius: 15,
				};
				const processedTrack = await virtualBackgroundProcessor.startProcessing(
					videoTrack,
					options,
				);
				videoRef.current.srcObject = new MediaStream([processedTrack]);
			}
		};

		getMedia();
	}, [videoRef.current, currentVideoDeviceId, enableBackgroundBlur]);

	useEffect(() => {
		return () => {
			if (stream) {
				for (const track of stream.getTracks()) {
					track.stop();
				}
			}
		};
	}, [stream]);

	return (
		<Flex flexDirection="column">
			<video
				ref={videoRef}
				style={{ width: "480px", height: "360px", background: "#000" }}
				autoPlay
				playsInline
				muted
			/>
			<RadioGroup
				value={currentVideoDeviceId}
				onChange={(value) => setCurrentVideoDeviceId(value)}
			>
				<Flex flexDirection="column">
					{videoDevices.map((device) => (
						<Radio key={device.deviceId} value={device.deviceId}>
							{device.label}
						</Radio>
					))}
				</Flex>
			</RadioGroup>
			<Flex width="500px">
				<Text>背景ぼかし</Text>
				<Switch
					id="enableBackgroundBlur"
					isChecked={enableBackgroundBlur}
					onChange={(e) => setEnableBackgroundBlur(e.target.checked)}
				/>
			</Flex>
		</Flex>
	);
}
