import * as React from "react";
import { User } from "lucide-react";
import { cn } from "@/utils/cn";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  name?: string; // Add name prop
  size?: "sm" | "md" | "lg" | "xs";
  colorScheme?: "blue" | "purple";
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      name,
      size = "md",
      colorScheme = "purple",
      ...props
    },
    ref,
  ) => {
    const [imageError, setImageError] = React.useState(false);

    React.useEffect(() => {
      setImageError(false); // Reset error when src changes
    }, [src]);

    const getInitials = (name: string) => {
      const names = name.trim().split(" ");
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    const sizeClasses = {
      xs: "h-6 w-6 text-xs font-medium",
      sm: "h-7 w-7 text-sm font-semibold",
      md: "h-10 w-10 text-lg",
      lg: "h-12 w-12 text-xl",
    };

    const colorClasses = {
      blue: "bg-lighten-blue/10 text-lighten-blue",
      purple: "bg-purple-light-5 text-purple",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full",
          sizeClasses[size],
          colorClasses[colorScheme],
          className,
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            className="aspect-square h-full w-full"
            src={src}
            alt={alt}
            onError={() => setImageError(true)}
          />
        ) : name ? (
          <span className="flex h-full w-full items-center justify-center rounded-full">
            {getInitials(name)}
          </span>
        ) : (
          <span className="flex h-full w-full items-center justify-center rounded-full">
            <User className="h-1/2 w-1/2" />
          </span>
        )}
      </div>
    );
  },
);

Avatar.displayName = "Avatar";

export { Avatar };
