import React, { JSX } from "react";

type HeadingLevel = 1 | 2 | 3 | 4;

interface HeadingProps {
  level?: HeadingLevel;
  children: React.ReactNode;
  className?: string;
}

const Heading: React.FC<HeadingProps> = ({
  level = 1,
  children,
  className = "",
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;

  const levelStyles: Record<HeadingLevel, string> = {
    1: "text-lg sm:text-xl md:text-2xl font-medium leading-relaxed",
    2: "text-base sm:text-lg md:text-xl font-medium leading-relaxed",
    3: "text-sm sm:text-base md:text-lg font-medium leading-relaxed",
    4: "text-sm md:text-base font-medium leading-relaxed",
  };

  return (
    <Tag className={` ${levelStyles[level]} ${className}`}>{children}</Tag>
  );
};

export default Heading;
