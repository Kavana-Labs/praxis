import appShowcase from "@/assets/app-showcase.svg"
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
            <div className="relative max-w-[583px] mx-auto text-center lg:pt-16 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
                <p className="text-[48px] font-bold">
                    Create Interactive<br />
                    <span className="text-[#652FF3]">Scientific Presentation</span>
                </p>
                <p className="text-[18px] font-normal text-[#4B5563] my-4">
                    The ultimate presentation tool for scientists, engineers, and educators. Embed live simulations, render equations, and visualize data—all in one powerful editor.
                </p>
                <div className="mt-[40px] mb-[18px] flex flex-row justify-center gap-4">
                    <a
                        href="#"
                        className="text-white font-semibold flex items-center justify-center gap-2 rounded-xl w-full sm:w-[190px] h-[48px] sm:h-[52px] bg-gradient-to-r from-[#5B16E1] to-[#805DF7] transition-transform duration-200 ease-out active:scale-[0.98]"
                    >
                        Get Started
                    </a>
                    <a
                        href="#"
                        className="flex w-full sm:w-[190px] h-[52px] text-[#4B5563] font-semibold items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-slate-900 font-medium transition hover:bg-slate-50 active:scale-[0.98]"
                    >
                        Try Demo
                    </a>
                </div>
                <p className="text-[18px] text-[#4B5563]">
                    <span className="font-semibold">Trusted by</span> Scientists, Engineers & Educators Worldwide
                </p>
            </div>
            <img
                className="relative top-[-41px] -z-[9] w-full h-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000 pointer-events-none"
                src={appShowcase}
                alt=""
                aria-hidden="true"
                decoding="async"
            />
        </section>
    )
}

export default HeroSection
