import { VirtualBackgroundProcessor } from "@shiguredo/virtual-background";

const assetsPath =
	"https://cdn.jsdelivr.net/npm/@shiguredo/virtual-background@latest/dist";
const virtualBackgroundProcessor = new VirtualBackgroundProcessor(assetsPath);

export function mediaDecorator({
	videoRef,
	audioTrackRef,
	videoTrackRef,
	currentVideoDeviceId,
	currentAudioDeviceId,
	enableNoiseCancellation,
	enableBackgroundBlur,
	setMicrophoneVolume,
	setMicrophoneVolumeSize,
}: {
	videoRef: React.RefObject<HTMLVideoElement>;
	audioTrackRef: React.RefObject<MediaStreamTrack | null>;
	videoTrackRef: React.RefObject<MediaStreamTrack | null>;
	currentVideoDeviceId: string | null;
	currentAudioDeviceId: string | null;
	enableNoiseCancellation: boolean;
	enableBackgroundBlur: boolean;
	setMicrophoneVolume: (volume: number) => void;
	setMicrophoneVolumeSize: (size: number) => void;
}) {
	navigator.mediaDevices
		.getUserMedia({
			video: {
				deviceId: currentVideoDeviceId
					? { exact: currentVideoDeviceId }
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

	return {
		videoRef,
		audioTrackRef,
		videoTrackRef,
		virtualBackgroundProcessor,
	};
}

export function stopMedia({
	audioTrackRef,
	videoTrackRef,
}: {
	audioTrackRef: React.RefObject<MediaStreamTrack | null>;
	videoTrackRef: React.RefObject<MediaStreamTrack | null>;
}) {
	virtualBackgroundProcessor.stopProcessing();

	if (videoTrackRef.current) {
		videoTrackRef.current.stop();
	}
	if (audioTrackRef.current) {
		audioTrackRef.current.stop();
	}
}
