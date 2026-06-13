import backgroundMask from "@/assets/landing-page-bg-mask.svg"
import mathBackground from "@/assets/math_background.png"
import { ctaPrimary, ctaSecondary } from "./cta";


const HeroSection = () => {
    return (
        <section>
            <img
                className="fixed left-0 -z-10 motion-safe:animate-[float_24s_ease-in-out_infinite] pointer-events-none"
                src={mathBackground}
                alt=""
                aria-hidden="true"
                decoding="async"
            />
            <img
                className="-z-[9] absolute inset-0 w-full h-full motion-safe:animate-[float_30s_ease-in-out_infinite] pointer-events-none"
                src={backgroundMask}
                alt=""
                aria-hidden="true"
                decoding="async"
            />
            <div className="relative mx-auto max-w-[600px] px-4 text-center lg:pt-16 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
                <h1 className="text-[34px] font-bold leading-[1.1] tracking-tight text-[#111827] sm:text-[44px] lg:text-[52px] lg:leading-[1.08]">
                    Create Interactive<br />
                    <span className="text-[#652FF3]">Scientific Presentations</span>
                </h1>
                <p className="mx-auto mt-5 max-w-[520px] text-[16px] leading-relaxed text-[#4B5563] sm:text-[18px]">
                    The presentation tool for scientists, engineers, and educators. Embed live simulations, render equations, and visualize data — all in one powerful editor.
                </p>
                <div className="mb-[18px] mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                    <a href="/app" className={ctaPrimary}>
                        Get Started
                    </a>
                    <a href="/editor" className={ctaSecondary}>
                        Open Editor
                    </a>
                </div>
                <p className="text-[16px] text-[#4B5563] sm:text-[18px]">
                    <span className="font-semibold text-[#1F2937]">Trusted by</span> scientists, engineers &amp; educators worldwide
                </p>
            </div>
        </section>
    )
}

export default HeroSection
