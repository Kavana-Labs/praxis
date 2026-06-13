import backgroundMask from "@/assets/landing-page-bg-mask.svg"
import mathBackground from "@/assets/math_background.png"


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
            <div className="relative mx-auto max-w-[583px] px-4 text-center lg:pt-16 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
                <p className="text-[34px] font-bold leading-tight sm:text-[42px] lg:text-[48px] lg:leading-[56px]">
                    Create Interactive<br />
                    <span className="text-[#652FF3]">Scientific Presentation</span>
                </p>
                <p className="my-4 text-[16px] font-normal leading-[normal] text-[#4B5563] sm:text-[18px]">
                    The ultimate presentation tool for scientists, engineers, and educators. Embed live simulations, render equations, and visualize data—all in one powerful editor.
                </p>
                <div className="mt-[40px] mb-[18px] flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                    <a
                        href="/app"
                        className="shadow-[0_73px_20px_0_rgba(92,23,226,0.00),_0_47px_19px_0_rgba(92,23,226,0.01),_0_26px_16px_0_rgba(92,23,226,0.05),_0_12px_12px_0_rgba(92,23,226,0.09),_0_3px_6px_0_rgba(92,23,226,0.10)] text-white font-semibold flex items-center justify-center gap-2 rounded-xl w-full sm:w-[190px] h-[48px] sm:h-[52px] bg-gradient-to-r from-[#5B16E1] to-[#805DF7] transition-transform duration-200 ease-out active:scale-[0.98]"
                    >
                        Get Started
                    </a>
                    <a
                        href="/editor"
                        className="flex w-full sm:w-[190px] h-[52px] text-[#4B5563] font-semibold items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-slate-900 font-medium transition hover:bg-slate-50 active:scale-[0.98]"
                    >
                        Open Editor
                    </a>
                </div>
                <p className="text-[18px] text-[#4B5563]">
                    <span className="font-semibold">Trusted by</span> Scientists, Engineers & Educators Worldwide
                </p>
            </div>
        </section>
    )
}

export default HeroSection
