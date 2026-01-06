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
        <div className="relative z-10 bg-white rounded-[16px] py-[21px] px-[32px] max-w-[380px] overflow-hidden">
            <div className={`why-feature-blur -z-1 ${blurBg}`}></div>
            <img className="absolute blue-[93px]" />
            <div className="min-h-[267px] flex justify-center">
                <img className="w-full" src={imageUrl} />
            </div>
            <p className="text-[#111827] text-[22px] font-[500] mb-[16px] text-left">{title}</p>
            <p className="text-[#6B7280] text-[16px] text-left font-[300]">{text}</p>
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
        <div className="flex flex-col justify-center text-center">
            <div className="relative overflow-hidden rounded-[40px] bg-[#F3F4F6] min-h-[680px] grid-overlay px-[69px] py-[71px] inline-block mx-auto">

                {/* background image */}
                <img
                    className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none motion-safe:animate-[float_30s_ease-in-out_infinite]"
                    src={backgroundMask}
                    aria-hidden="true"
                />

                {/* content */}
                <div className="relative z-10 text-center">
                    <p className="text-[48px] font-bold">
                        Why Scientist Choose <span className="text-[#652FF3]">Praxis</span>
                    </p>
                    <p className="text-[18px] text-[#4B5563] mb-[36px] mt-[32px]">
                        Tailored to Scientific Thinking
                    </p>

                    <div className="flex gap-[24px] justify-center">
                        {whyItems.map(item => (
                            <WItem {...item} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="mt-[40px] mb-[18px] flex flex-row justify-center gap-4">
                <a
                    href="#"
                    className="shadow-[0_73px_20px_0_rgba(92,23,226,0.00),_0_47px_19px_0_rgba(92,23,226,0.01),_0_26px_16px_0_rgba(92,23,226,0.05),_0_12px_12px_0_rgba(92,23,226,0.09),_0_3px_6px_0_rgba(92,23,226,0.10)] text-white font-semibold flex items-center justify-center gap-2 rounded-xl w-full sm:w-[190px] h-[48px] sm:h-[52px] bg-gradient-to-r from-[#5B16E1] to-[#805DF7] transition-transform duration-200 ease-out active:scale-[0.98]"
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
    )
}


export default WhySection;