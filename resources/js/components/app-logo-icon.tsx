import type { ImgHTMLAttributes } from 'react';

interface AppLogoIconProps extends Omit<
    ImgHTMLAttributes<HTMLImageElement>,
    'src' | 'alt'
> {
    size?: number;
}

export default function AppLogoIcon({
    size = 36,
    className,
    ...props
}: AppLogoIconProps) {
    return (
        <img
            src="/images/larrykonn.png"
            alt="Larrykonn"
            width={size}
            height={size}
            className={className}
            {...props}
        />
    );
}
