import * as React from 'react';
import { useLightboxProps, useEvents, useContainerRect, useEventCallback, clsx, cssClass } from '../../index.js';
import { ACTIVE_SLIDE_LOADING, CLASS_FLEX_CENTER, CLASS_SLIDE_WRAPPER, ACTIVE_SLIDE_PLAYING, ACTIVE_SLIDE_COMPLETE } from '../../types.js';

const defaultVideoProps = {
    controls: true,
    playsInline: true,
};
const resolveVideoProps = (video) => ({
    ...defaultVideoProps,
    ...video,
});
function useVideoProps() {
    const { video } = useLightboxProps();
    return resolveVideoProps(video);
}

function VideoSlide({ slide, offset }) {
    const video = useVideoProps();
    const { publish } = useEvents();
    const { setContainerRef, containerRect } = useContainerRect();
    const videoRef = React.useRef(null);
    React.useEffect(() => {
        if (offset !== 0 && videoRef.current && !videoRef.current.paused) {
            videoRef.current.pause();
        }
    }, [offset]);
    React.useEffect(() => {
        if (offset === 0 && videoRef.current && (slide.autoPlay || video.autoPlay)) {
            publish(ACTIVE_SLIDE_LOADING);
            videoRef.current.play().catch(() => { });
        }
    }, [offset, video.autoPlay, slide.autoPlay, publish]);
    const handleVideoRef = useEventCallback((node) => {
        if (offset === 0 && (video.autoPlay || slide.autoPlay) && node.paused) {
            node.play().catch(() => { });
        }
    });
    const setVideoRef = React.useCallback((node) => {
        videoRef.current = node;
        if (node) {
            handleVideoRef(node);
        }
    }, [handleVideoRef]);
    const { width, height, poster, sources } = slide;
    const scaleWidthAndHeight = () => {
        const scalingProps = {};
        scalingProps.style = { maxWidth: "100%", maxHeight: "100%" };
        if (width && height && containerRect) {
            const widthBound = width / height > containerRect.width / containerRect.height;
            const elementWidth = widthBound ? containerRect.width : Math.round((containerRect.height / height) * width);
            const elementHeight = !widthBound ? containerRect.height : Math.round((containerRect.width / width) * height);
            scalingProps.width = elementWidth;
            scalingProps.height = elementHeight;
            scalingProps.style.width = elementWidth;
            scalingProps.style.height = elementHeight;
        }
        return scalingProps;
    };
    const resolveBoolean = (attr) => {
        if (slide[attr] === false)
            return null;
        if (slide[attr] === true)
            return { [attr]: true };
        if (video[attr] === false)
            return null;
        if (video[attr] === true)
            return { [attr]: true };
        return null;
    };
    const resolveString = (attr) => {
        if (video[attr] || slide[attr]) {
            return { [attr]: slide[attr] || video[attr] };
        }
        return null;
    };
    return (React.createElement(React.Fragment, null, sources && (React.createElement("div", { ref: setContainerRef, style: {
            width: "100%",
            height: "100%",
            ...(width ? { maxWidth: `${width}px` } : null),
        }, className: clsx(cssClass("video_container"), cssClass(CLASS_FLEX_CENTER), cssClass(CLASS_SLIDE_WRAPPER)) }, containerRect && (React.createElement("video", { ref: setVideoRef, poster: poster, ...scaleWidthAndHeight(), ...resolveBoolean("controls"), ...resolveBoolean("playsInline"), ...resolveBoolean("loop"), ...resolveBoolean("muted"), ...resolveBoolean("playsInline"), ...resolveBoolean("disablePictureInPicture"), ...resolveBoolean("disableRemotePlayback"), ...resolveString("controlsList"), ...resolveString("crossOrigin"), ...resolveString("preload"), onPlay: () => {
            var _a;
            if (offset !== 0) {
                (_a = videoRef.current) === null || _a === void 0 ? void 0 : _a.pause();
                return;
            }
            publish(ACTIVE_SLIDE_PLAYING);
        }, onEnded: () => {
            publish(ACTIVE_SLIDE_COMPLETE);
        } }, sources.map(({ src, type, media }) => (React.createElement("source", { key: [src, type, media].filter(Boolean).join("|"), src: src, type: type, media: media })))))))));
}

function isVideoSlide(slide) {
    return slide.type === "video";
}
function Video({ augment }) {
    augment(({ render: { slide: renderSlide, ...restRender }, video, ...restProps }) => ({
        render: {
            slide: ({ slide, offset, rect }) => {
                var _a;
                return isVideoSlide(slide) ? (React.createElement(VideoSlide, { key: (_a = slide.sources) === null || _a === void 0 ? void 0 : _a.map((source) => source.src).join("|"), slide: slide, offset: offset })) : (renderSlide === null || renderSlide === void 0 ? void 0 : renderSlide({ slide, offset, rect }));
            },
            ...restRender,
        },
        video: resolveVideoProps(video),
        ...restProps,
    }));
}

export { Video as default };
