export interface ReactPhotoEditorTranslations {
	close: string;
	save: string;
	rotate: string;
	brightness: string;
	contrast: string;
	saturate: string;
	grayscale: string;
	reset: string;
	flipHorizontal: string;
	flipVertical: string;
	zoomIn: string;
	zoomOut: string;
	resolution: string;
	aspectRatio: string;
	apply: string;
	cancel: string;
	fitHeight: string;
	editPicture: string;
	color: string;
}

export interface Resolution {
	width: number;
	height: number;
}

export interface ReactPhotoEditorProps {
	/**
	 * The input image file to be edited.
	 */
	file: File | undefined;

	/**
	 * Whether to allow color editing options.
	 * @default true
	 */
	allowColorEditing?: boolean;

	/**
	 * Whether to allow rotation of the image.
	 * @default true
	 */
	allowRotate?: boolean;

	/**
	 * Whether to allow flipping (horizontal/vertical) of the image.
	 * @default true
	 */
	allowFlip?: boolean;

	/**
	 * Whether to allow zooming of the image.
	 * @default true
	 */
	allowZoom?: boolean;

	/**
	 * Whether to enable the option to download the edited image upon saving.
	 * @default false
	 */
	downloadOnSave?: boolean;

	/**
	 * Whether the photo editor modal is open.
	 * @default false
	 */
	open?: boolean;

	/**
	 * Function invoked when the photo editor modal is closed.
	 */
	onClose?: () => void;

	/**
	 * Function invoked when the edited image is saved.
	 * @param image - The edited image file.
	 */
	onSaveImage: (image: File) => void;

	/**
	 * The height of the photo editor modal.
	 * This can be specified as a number (pixels) or string (CSS value).
	 * @default '38rem'
	 */
	modalHeight?: number | string;

	/**
	 * The width of the photo editor modal.
	 * This can be specified as a number (pixels) or string (CSS value).
	 * @default '40rem'
	 */
	modalWidth?: number | string;

	/**
	 * The width of the canvas element used for editing the image.
	 * This can be specified as a number (pixels) or string (CSS value).
	 * @default 'auto'
	 */
	canvasWidth?: number | string;

	/**
	 * The height of the canvas element used for editing the image.
	 * This can be specified as a number or string (CSS value).
	 * @default 'auto'
	 */
	canvasHeight?: number | string;

	/**
	 * The maximum height of the canvas element.
	 * This can be specified as a number or string (CSS value).
	 * @default '22rem'
	 */
	maxCanvasHeight?: number | string;

	/**
	 * The maximum width of the canvas element.
	 * This can be specified as a number or string (CSS value).
	 * @default '36rem'
	 */
	maxCanvasWidth?: number | string;

	/**
	 * Custom labels or text options for various elements in the photo editor.
	 * Use this to override default text for buttons, tooltips, etc.
	 *
	 * Example:
	 * labels: {
	 *     close: 'Exit',
	 *     save: 'Apply Changes',
	 *     rotate: 'Turn',
	 * }
	 */
	labels?: ReactPhotoEditorTranslations;

	/**
	 * The resolution of the output image.
	 * @default { width: 512, height: 512 }
	 */
	resolution?: Resolution;

	/**
	 * Whether to allow resolution settings.
	 * @default true
	 */
	allowResolutionSettings?: boolean;

	/**
	 * Whether to allow aspect ratio settings.
	 * @default true
	 */
	allowAspectRatioSettings?: boolean;

	/**
	 * Predefined resolution options.
	 * @default [
	 *   { width: 512, height: 512 },
	 *   { width: 512, height: 288 },
	 *   { width: 768, height: 320 },
	 *   { width: 768, height: 512 },
	 *   { width: 1024, height: 576 }
	 * ]
	 */
	resolutionOptions?: Resolution[];

	/**
	 * Predefined aspect ratio options.
	 * @default ['16:9', '9:16', '21:9', '4:3', '1:1']
	 */
	aspectRatioOptions?: string[];
} 