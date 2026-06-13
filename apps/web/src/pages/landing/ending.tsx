import { ctaPrimary, ctaSecondary } from "./cta";
const EndingSection = () => {
    return (
        <div className="mx-4 my-16 flex flex-col items-center overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white bg-[radial-gradient(#e5e7eb_1.2px,transparent_1.2px)] [background-size:18px_18px] px-6 py-12 text-center shadow-[0_24px_60px_-24px_rgba(75,85,99,0.18)] sm:mx-auto sm:my-28 sm:max-w-[960px] sm:px-[69px] sm:py-[64px] lg:my-[160px]">
            <h2 className="text-[28px] font-bold leading-[1.12] tracking-tight text-[#111827] sm:text-[40px] lg:text-[46px]">Ready to Create Interactive<br /><span className="text-[#652FF3]">Scientific Presentations</span></h2>
            <p className="mx-auto mb-9 mt-5 max-w-[520px] text-[16px] leading-relaxed text-[#4B5563] sm:text-[18px]">Join thousands of scientists, engineers, and educators already creating stunning scientific presentations.</p>
            <div className="flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
                <a href="/app" className={ctaPrimary}>
                    Create Presentation
                </a>
                <a href="/editor" className={ctaSecondary}>
                    Try Demo
                </a>
            </div>
        </div>
    );
}


export default EndingSection;
