import {
	ButtonGroup,
	Divider,
	Flex,
	Icon,
	IconButton,
	Popover,
	PopoverArrow,
	PopoverBody,
	PopoverContent,
	PopoverHeader,
	PopoverTrigger,
	Progress,
	Radio,
	RadioGroup,
	Slider,
	SliderFilledTrack,
	SliderThumb,
	SliderTrack,
	Switch,
	Text,
} from "@chakra-ui/react";
import { useMutation } from "@tanstack/react-query";
import { useAtom, useAtomValue } from "jotai";
import { ChangeEvent, RefObject, useEffect, useState } from "react";
import { MdArrowDropUp, MdOutlineMic, MdOutlineMicOff } from "react-icons/md";
import { Else, If, Then } from "react-if";
import { jwtTokenAtom } from "../atoms/current-user";
import {
	currentAudioDeviceIdAtom,
	enableMicrophoneAtom,
	enableNoiseCancellationAtom,
	microphoneUnderGainAtom,
	microphoneVolumeFilteredAtom,
} from "../atoms/media";
import { DeviceType, getDevices } from "../libs/devices";
import { httpClient } from "../libs/http-client";

export function MicrophoneButton({
	audioTrackRef,
}: { audioTrackRef: RefObject<MediaStreamTrack | null> }) {
	const jwtToken = useAtomValue(jwtTokenAtom);
	const [enableMicrophone, setEnableMicrophone] = useAtom(enableMicrophoneAtom);
	const microphoneVolumeFiltered = useAtomValue(microphoneVolumeFilteredAtom);
	const [microphoneUnderGain, setMicrophoneUnderGain] = useAtom(
		microphoneUnderGainAtom,
	);
	const [enableNoiseCancellation, setEnableNoiseCancellation] = useAtom(
		enableNoiseCancellationAtom,
	);
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [currentAudioDeviceId, setCurrentAudioDeviceId] = useAtom(
		currentAudioDeviceIdAtom,
	);

	const { mutate, isPending } = useMutation({
		mutationFn: (data: { enable: boolean }) => {
			return httpClient({ jwtToken })
				.patch("auth/settings", {
					json: { target: "microphone", enable: data.enable },
				})
				.json();
		},
		onSuccess: (body: { enableMicrophone: boolean }) => {
			setEnableMicrophone(body.enableMicrophone);
			if (audioTrackRef.current) {
				audioTrackRef.current.enabled = body.enableMicrophone;
			}
		},
		onError: () => {
			alert("Failed to update microphone settings");
		},
	});

	const {
		mutate: updateMicrophoneUnderGain,
		isPending: updateMicrophoneUnderGainIsPending,
	} = useMutation({
		mutationFn: (data: { microphoneUnderGain: number }) => {
			return httpClient({ jwtToken })
				.patch("auth/settings/values", {
					json: data,
				})
				.json();
		},
		onSuccess: (body: { microphoneUnderGain: number }) => {
			setMicrophoneUnderGain(body.microphoneUnderGain);
		},
		onError: () => {
			alert("Failed to update microphone settings");
		},
	});

	const onChangeMicrophoneUnderGain = (value: number) => {
		updateMicrophoneUnderGain({ microphoneUnderGain: value });
	};

	const {
		mutate: updateEnableNoiseCancellation,
		isPending: updateEnableNoiseCancellationIsPending,
	} = useMutation({
		mutationFn: (data: { enableNoiseCancellation: boolean }) => {
			return httpClient({ jwtToken })
				.patch("auth/settings/values", {
					json: data,
				})
				.json();
		},
		onSuccess: (body: { enableNoiseCancellation: boolean }) => {
			setEnableNoiseCancellation(body.enableNoiseCancellation);
		},
		onError: () => {
			alert("Failed to update microphone settings");
		},
	});

	const {
		mutate: updateCurrentAudioDeviceId,
		isPending: updateCurrentAudioDeviceIdIsPending,
	} = useMutation({
		mutationFn: (data: { currentAudioDeviceId: string }) => {
			return httpClient({ jwtToken })
				.patch("auth/settings/values", {
					json: data,
				})
				.json();
		},
		onSuccess: (body: { currentAudioDeviceId: string }) => {
			setCurrentAudioDeviceId(body.currentAudioDeviceId);
		},
		onError: () => {
			alert("Failed to update microphone settings");
		},
	});

	const onChangeEnableNoiseCancellation = (
		e: ChangeEvent<HTMLInputElement>,
	) => {
		updateEnableNoiseCancellation({
			enableNoiseCancellation: e.target.checked,
		});
	};

	const onChangeCurrentAudioDeviceId = (value: string) => {
		updateCurrentAudioDeviceId({ currentAudioDeviceId: value });
	};

	useEffect(() => {
		// マイクデバイスの一覧を取得
		const promise = async () => {
			const devices = await getDevices(DeviceType.microphone);
			setAudioDevices(devices);
		};

		promise();
	}, []);

	return (
		<ButtonGroup isAttached>
			<If condition={enableMicrophone}>
				<Then>
					<IconButton
						isRound={true}
						variant="solid"
						aria-label="Mic Off"
						fontSize="20px"
						onClick={() => mutate({ enable: false })}
						isLoading={isPending}
						icon={<Icon as={MdOutlineMic} />}
					/>
				</Then>
				<Else>
					<IconButton
						isRound={true}
						variant="solid"
						aria-label="Mic On"
						fontSize="20px"
						colorScheme="red"
						onClick={() => mutate({ enable: true })}
						isLoading={isPending}
						icon={<Icon as={MdOutlineMicOff} />}
					/>
				</Else>
			</If>
			<Popover placement="top">
				<PopoverTrigger>
					<IconButton
						isRound={true}
						aria-label="show select"
						icon={<Icon as={MdArrowDropUp} />}
					/>
				</PopoverTrigger>
				<PopoverContent width="350px">
					<PopoverHeader fontWeight="semibold">マイク設定</PopoverHeader>
					<PopoverArrow />
					<PopoverBody>
						<RadioGroup
							value={currentAudioDeviceId ?? audioDevices[0]?.deviceId}
							onChange={onChangeCurrentAudioDeviceId}
							isDisabled={updateCurrentAudioDeviceIdIsPending}
						>
							<Flex flexDirection="column">
								{audioDevices.map((device) => (
									<Radio key={device.deviceId} value={device.deviceId}>
										{device.label}
									</Radio>
								))}
							</Flex>
						</RadioGroup>
						<Divider margin="5px 0" />
						<Text fontWeight="bold" marginBottom="5px">
							入力感度
						</Text>
						<Progress
							colorScheme="teal"
							size="xs"
							value={microphoneVolumeFiltered}
							width="100%"
						/>
						<Slider
							aria-label="volume-under-gain"
							colorScheme="pink"
							onChange={onChangeMicrophoneUnderGain}
							value={microphoneUnderGain}
							isDisabled={updateMicrophoneUnderGainIsPending}
						>
							<SliderTrack>
								<SliderFilledTrack />
							</SliderTrack>
							<SliderThumb />
						</Slider>
						<Flex justifyContent="space-between">
							<Text>ノイズ抑制</Text>
							<Switch
								id="enableNoiseCancellation"
								isChecked={enableNoiseCancellation}
								onChange={onChangeEnableNoiseCancellation}
								isDisabled={updateEnableNoiseCancellationIsPending}
							/>
						</Flex>
					</PopoverBody>
				</PopoverContent>
			</Popover>
		</ButtonGroup>
	);
}
