import { Sigma, Cpu, FlaskConical } from "lucide-react";
import latexFeatureSample from "@/assets/latex-feature-sample.svg"
import circuitDiagramSample from "@/assets/circuit-diagram-feature.svg";
import chemistrySample from "@/assets/chemistry-feature.svg";
import circuitBgMask from "@/assets/circuit-bg-mask.svg";
import codeSimFeature from "@/assets/code-sim-feature.svg";
import graphPlotFeature from "@/assets/graph-plot-feature.svg"


type FeatureProps = {
    categoryIcon: React.ReactNode,
    tag: React.ReactNode,
    title: string,
    text: string,
    imageUrl: string,
    bgMask?: string,
    colSpan?: boolean | false;
};

type TagProps = {
    color: string,
    name: string,
}


const Tag: React.FC<TagProps> = ({ color, name }) => {
    return <span style={{ borderColor: color, color: color }} className={`border border-dashed border-1 border-[${color}] rounded-[16px] py-[8px] px-[12px] text-[${color}]`}>{name}</span>
}

const FeatureCard: React.FC<FeatureProps> = ({ categoryIcon, tag, title, text, imageUrl, bgMask, colSpan }) => {

    return (
        <div className={`${colSpan == true ? 'col-span-2 w-full' : 'max-w-[380px]'} border relative max-h-[457px] rounded-[24px] border border-1 border-[#202023] bg-[#0A0A0A52] p-[32px] text-left flex flex-col mb-[32px] shadow-[inset_0_-34px_64px_0_rgba(255,255,255,0.16)]`}>
            {bgMask && <img className="absolute top-0 right-[-50px]" src={bgMask} alt="" />}
            <div className="flex justify-between items-start mb-[24px]">
                {categoryIcon}
                {tag}
            </div>
            <p className="text-[22px] font-[500] mb-[16px]">{title}</p>
            <p className="text-[16px] font-[300] text-[#D1D5DB] mb-[32px]">{text}</p>
            <img className="w-full max-h-[192px] object-contain" src={imageUrl} alt="" />
        </div>
    );
}

const featureListA: Array<FeatureProps> = [
    {
        categoryIcon: <div className="bg-[#F2EEFF] rounded-[12px] p-[8px]"><Sigma color="#652FF3" size={24} /></div>,
        title: "LaTex Mathemattics",
        tag: <Tag name="Mathematics" color="#652FF3" />,
        text: "White and render LaTex math as easily as text from simple fractions to complex derrivations",
        imageUrl: latexFeatureSample,
    },
    {
        categoryIcon: <div className="bg-[#FFF5EE] rounded-[12px] p-[8px]"><Cpu color="#FF6A00" /></div>,
        title: "Circuit Diagrams",
        tag: <Tag name="Engineering" color="#FFAB6E" />,
        text: "Professional electronic circuit symbols and schematic design tools.",
        imageUrl: circuitDiagramSample,
        bgMask: circuitBgMask,
    },
    {
        categoryIcon: <div className="bg-[#E6FFF3] rounded-[12px] p-[8px]"><FlaskConical color="#12B164" /></div>,
        title: "Chemical Structure",
        tag: <Tag name="Chemistry" color="#12B164" />,
        text: "ChemDraw-like toolkit for molecular structures and chemical formulas.",
        imageUrl: chemistrySample,
    },]
const featureListB: Array<FeatureProps> = [
    {
        categoryIcon: <div className="bg-[#E6FFF3] rounded-[12px] p-[8px]"><FlaskConical color="#12B164" /></div>,
        title: "Code Simulation",
        tag: <Tag name="Computation" color="#F3F08E" />,
        text: "White and render LaTex math as easily as text from simple fractions to complex derivations",
        imageUrl: codeSimFeature,
        colSpan: true,
    },
    {
        categoryIcon: <div className="bg-[#E6FFF3] rounded-[12px] p-[8px]"><FlaskConical color="#12B164" /></div>,
        title: "Graph Plotting",
        tag: <Tag name="Mathematics" color="#B6A8FC" />,
        text: "Interactive 2D and 3D graphs, charts, and data visualizations.",
        imageUrl: graphPlotFeature,
    }
]

const FeaturesSection = () => {
    return (
        <div className="max-w-[1320px] mx-auto bg-[#060606] pt-[150px] text-center text-white mt-[118px] rounded-[48px]">
            <p className="text-[48px] font-bold text-white mb-[32px]">Everything You Need for<br /> <span className="text-[#C4BCFB]">Scientific Presentations</span></p>
            <p className="text-[18px] font-[400] mb-[79px]">Professional-grade tools designed specifically for STEM<br /> education, research, and engineering documentation.</p>


            <div className="flex flex-row justify-center gap-[24px]">
                {featureListA.map(feature => <FeatureCard {...feature} />)}
            </div>

            <div className="grid grid-cols-[repeat(3,minmax(0,380px))] gap-6 mx-auto w-fit">
                {featureListB.map((feature) => <FeatureCard {...feature} />)}
            </div>
        </div>
    )
}


export default FeaturesSection;