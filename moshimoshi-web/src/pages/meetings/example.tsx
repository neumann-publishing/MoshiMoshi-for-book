import { Flex, Radio, RadioGroup } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { DeviceType, getDevices } from "../../libs/devices";

export function MeetingsExamplePage() {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [currentVideoDeviceId, setCurrentVideoDeviceId] = useState<string>();
	const [stream, setStream] = useState<MediaStream | null>(null);

	useEffect(() => {
		const getVideoDevices = async () => {
			const devices = await getDevices(DeviceType.camera);
			setVideoDevices(devices);
			setCurrentVideoDeviceId(devices[0]?.deviceId);
		};
		getVideoDevices();
	}, []);

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
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
		};
		getMedia();
	}, [currentVideoDeviceId]);

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
		</Flex>
	);
}
