const EndingSection = () => {
    return (
        <div className="max-w-[960px] my-[200px] mx-auto py-[58.5px] px-[69px] bg-[#FFFFFF] flex flex-col items-center text-center border border-1 border-[#E5E7EB] rounded-[24px] shadow-[0_94px_26px_0_rgba(75,85,99,0),0_60px_24px_0_rgba(75,85,99,0.01),0_34px_20px_0_rgba(75,85,99,0.02)] inset-0 h-full w-full bg-white bg-[radial-gradient(#e5e7ebcc_1.4px,transparent_1px)] bg-size-[16px_16px]">
            <p className="text-[48px] font-[600] leading-[56px]">Ready to Create Interactive<br /><span className="text-[#652FF3]">Scientific Presentation</span></p>
            <p className="mt-[32px] mb-[40px]">Join thousands of scientists, engineers, and educators who are already creating stunning <br/>scientific presentations.</p>
            <div className="mt-[40px] mb-[18px] flex flex-row justify-center gap-4">
                <a
                    href="#"
                    className="shadow-[0_73px_20px_0_rgba(92,23,226,0.00),_0_47px_19px_0_rgba(92,23,226,0.01),_0_26px_16px_0_rgba(92,23,226,0.05),_0_12px_12px_0_rgba(92,23,226,0.09),_0_3px_6px_0_rgba(92,23,226,0.10)] text-white font-semibold flex items-center justify-center gap-2 rounded-xl w-full sm:w-[190px] h-[48px] sm:h-[52px] bg-gradient-to-r from-[#5B16E1] to-[#805DF7] transition-transform duration-200 ease-out active:scale-[0.98]"
                >
                    Create Presentation
                </a>
                <a
                    href="#"
                    className="flex w-full sm:w-[190px] h-[52px] text-[#4B5563] font-semibold items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-slate-900 font-medium transition hover:bg-slate-50 active:scale-[0.98]"
                >
                    Try Demo
                </a>
            </div>
        </div>
    );
}


export default EndingSection;