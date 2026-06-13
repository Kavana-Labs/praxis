const EndingSection = () => {
    return (
        <div className="mx-4 my-16 flex h-full w-auto flex-col items-center rounded-[24px] border border-1 border-[#E5E7EB] bg-white bg-[radial-gradient(#e5e7ebcc_1.4px,transparent_1px)] bg-size-[16px_16px] px-6 py-10 text-center shadow-[0_94px_26px_0_rgba(75,85,99,0),0_60px_24px_0_rgba(75,85,99,0.01),0_34px_20px_0_rgba(75,85,99,0.02)] sm:mx-auto sm:my-28 sm:max-w-[960px] sm:px-[69px] sm:py-[58.5px] lg:my-[200px]">
            <p className="text-[28px] font-[600] leading-tight sm:text-[40px] lg:text-[48px] lg:leading-[56px]">Ready to Create Interactive<br /><span className="text-[#652FF3]">Scientific Presentation</span></p>
            <p className="mb-[40px] mt-[24px] sm:mt-[32px]">Join thousands of scientists, engineers, and educators who are already creating stunning scientific presentations.</p>
            <div className="mb-[18px] flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
                <a
                    href="/app"
                    className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B16E1] to-[#805DF7] font-semibold text-white shadow-[0_73px_20px_0_rgba(92,23,226,0.00),_0_47px_19px_0_rgba(92,23,226,0.01),_0_26px_16px_0_rgba(92,23,226,0.05),_0_12px_12px_0_rgba(92,23,226,0.09),_0_3px_6px_0_rgba(92,23,226,0.10)] transition-transform duration-200 ease-out active:scale-[0.98] sm:h-[52px] sm:w-[190px]"
                >
                    Create Presentation
                </a>
                <a
                    href="/editor"
                    className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 font-semibold text-[#4B5563] transition hover:bg-slate-50 active:scale-[0.98] sm:h-[52px] sm:w-[190px]"
                >
                    Try Demo
                </a>
            </div>
        </div>
    );
}


export default EndingSection;
