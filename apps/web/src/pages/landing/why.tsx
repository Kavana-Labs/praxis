import latexFeaturesImg from "@/assets/latex-feature.svg";
import ICodeFeatureImg from "@/assets/icode-feature.svg";
import backgroundMask from "@/assets/why-bg-mask.svg";


type WItemProps = {
    title: string,
    imageUrl: string,
    text: string,
    blurBg?: string,
};

const WItem: React.FC<WItemProps> = ({ title, imageUrl, text, blurBg }) => {
    return (
        <div className="relative z-10 w-full max-w-[380px] overflow-hidden rounded-[16px] bg-white px-6 py-5 sm:px-[32px] sm:py-[21px]">
            <div className={`why-feature-blur -z-1 ${blurBg ?? ""}`}></div>
            <div className="flex min-h-[180px] justify-center sm:min-h-[267px]">
                <img className="w-full" src={imageUrl} alt="" />
            </div>
            <p className="mb-[16px] text-left text-[20px] font-[500] text-[#111827] sm:text-[22px]">{title}</p>
            <p className="text-left text-[16px] font-[300] text-[#6B7280]">{text}</p>
        </div>
    );
}

const whyItems: Array<WItemProps> = [
    {
        imageUrl: latexFeaturesImg,
        title: "LaTex for Beautiful Equations",
        text: "Write and render LaTex math as easily as text from simple fractions to complex derrivations",
    },
    {
        imageUrl: ICodeFeatureImg,
        title: "Interactive Code & Plots",
        text: "Run Python, MATLAB or Julia code directly within slides, data with interactive plots build-in.",
        blurBg: "blur-bg-variant2"
    },
    {
        imageUrl: latexFeaturesImg,
        title: "Research-Grade Templates",
        text: "Professional template for lecturers, thesis defense, conferences, an lab presentation.",
        blurBg: "blur-bg-variant3"
    }
];

const WhySection = () => {
    return (
        <div className="flex flex-col justify-center px-4 text-center sm:px-6">
            <div className="relative mx-auto inline-block w-full max-w-[1240px] overflow-hidden rounded-[24px] bg-[#F3F4F6] px-5 py-12 grid-overlay sm:px-10 sm:py-16 lg:rounded-[40px] lg:px-[69px] lg:py-[71px]">

                {/* background image */}
                <img
                    className="absolute inset-0 z-0 h-full w-full object-cover pointer-events-none motion-safe:animate-[float_30s_ease-in-out_infinite]"
                    src={backgroundMask}
                    alt=""
                    aria-hidden="true"
                />

                {/* content */}
                <div className="relative z-10 text-center">
                    <p className="text-[30px] font-bold leading-tight sm:text-[40px] lg:text-[48px]">
                        Why Scientist Choose <span className="text-[#652FF3]">Praxis</span>
                    </p>
                    <p className="mb-[36px] mt-[24px] text-[18px] text-[#4B5563] sm:mt-[32px]">
                        Tailored to Scientific Thinking
                    </p>

                    <div className="flex flex-col items-center gap-6 lg:flex-row lg:flex-wrap lg:justify-center lg:gap-[24px]">
                        {whyItems.map((item) => (
                            <WItem key={item.title} {...item} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="mb-[18px] mt-[40px] flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
                <a
                    href="/editor"
                    className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#5B16E1] to-[#805DF7] font-semibold text-white shadow-[0_73px_20px_0_rgba(92,23,226,0.00),_0_47px_19px_0_rgba(92,23,226,0.01),_0_26px_16px_0_rgba(92,23,226,0.05),_0_12px_12px_0_rgba(92,23,226,0.09),_0_3px_6px_0_rgba(92,23,226,0.10)] transition-transform duration-200 ease-out active:scale-[0.98] sm:h-[52px] sm:w-[190px]"
                >
                    Get Started
                </a>
                <a
                    href="/editor"
                    className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 font-semibold text-[#4B5563] transition hover:bg-slate-50 active:scale-[0.98] sm:h-[52px] sm:w-[190px]"
                >
                    Try Demo
                </a>
            </div>
            <p className="text-[18px] text-[#4B5563]">
                <span className="font-semibold">Trusted by</span> Scientists, Engineers & Educators Worldwide
            </p>
        </div>
    )
}


export default WhySection;
