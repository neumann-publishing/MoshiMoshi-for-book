import { atom } from "jotai";

export const enableVideoAtom = atom<boolean>(true);
export const enableMicrophoneAtom = atom<boolean>(true);
export const enableSpeakerAtom = atom<boolean>(true);
export const microphoneUnderGainAtom = atom<number>(10);
export const enableNoiseCancellationAtom = atom<boolean>(true);
export const currentAudioDeviceIdAtom = atom<string | null>();
export const currentVideoDeviceIdAtom = atom<string | null>();
export const enableBackgroundBlurAtom = atom<boolean>(false);
export const currentSpeakerDeviceIdAtom = atom<string | null>();

// これらはDBに保存しない
export const microphoneVolumeAtom = atom<number>(0);
export const microphoneVolumeSizeAtom = atom<number>(128);
export const microphoneVolumeFilteredAtom = atom<number>((get) => {
	const normalizedVolume =
		(get(microphoneVolumeAtom) / get(microphoneVolumeSizeAtom)) * 100;

	return normalizedVolume < get(microphoneUnderGainAtom) ? 0 : normalizedVolume;
});
