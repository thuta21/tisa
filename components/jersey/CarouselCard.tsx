"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { getJerseyKitImage, kitImageFilters, type Jersey, type KitVariant } from "@/lib/jerseys";

export default function CarouselCard({
  jersey,
  isActive,
  selectedKit,
  onClick,
}: {
  jersey: Jersey;
  isActive: boolean;
  selectedKit: KitVariant;
  onClick?: () => void;
}) {
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const kitImage = getJerseyKitImage(jersey, selectedKit);
  const imageFilter = `drop-shadow(0 20px 30px rgba(0,0,0,0.35)) ${kitImageFilters[selectedKit]}`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isActive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTiltX(y * -12);
    setTiltY(x * 12);
  };

  const handleMouseLeave = () => {
    setTiltX(0);
    setTiltY(0);
  };

  const handleClick = () => {
    onClick?.();
  };

  return (
    <div
      ref={cardRef}
      className="w-full h-full cursor-pointer"
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div
        className="relative w-full h-full transition-transform duration-700 ease-out"
        style={{
          transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
        }}
      >
        <div
          className="absolute inset-0 flex flex-col items-center overflow-visible"
        >
          <div className="relative w-full h-full">
            <CarouselImage key={kitImage} source={kitImage} alt={`${jersey.name} front`} filter={imageFilter} />
          </div>
        </div>
      </div>

      {isActive && <div className="absolute -inset-4 pointer-events-none -z-10" />}
    </div>
  );
}

function CarouselImage({ source, alt, filter }: { source: string; alt: string; filter: string }) {
  const [imageSrc, setImageSrc] = useState(source);
  return <Image src={imageSrc} alt={alt} fill sizes="300px" className="pointer-events-none select-none object-contain" style={{ filter }} onError={() => setImageSrc("/assets/tisa-shirt.png")} />;
}
