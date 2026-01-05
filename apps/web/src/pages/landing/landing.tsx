import Header from "../../components/header"

const Landing = () => {
    return (
        <div>
            <Header />
            <HeroSection />
            {/* <ProductShowCase /> */}
        </div>
    )
}


const HeroSection = () => {
    return (
        <section>
            <img className="fixed left-0 -z-10" src="src/assets/math_background.png" alt="" />
            <img className="-z-9 absolute inset w-full h-full" src="src/assets/landing-page-bg-mask.svg" alt="" />
            <div className="relative max-w-[583px] mx-auto text-center lg:pt-16">
                <p className="text-[48px] font-bold">Create Interactive<br /><span className="text-[#652FF3]">Scientific Presentation</span></p>
                <p className="text-[18px] font-normal text-[#4B5563] my-4">The ultimate presentation tool for scientists, engineers, and educators. Embed live simulations, render equations, and visualize data—all in one powerful editor.</p>
                <div className="mt-[40px] mb-[18px] flex flex-row justify-center gap-4">
                    <a href="#" className="text-white font-semibold flex items-center justify-center gap-2 rounded-xl w-full sm:w-[190px] h-[48px] sm:h-[52px] bg-gradient-to-r from-[#5B16E1] to-[#805DF7]">
                        Get Started
                    </a>
                    <a href="#" className="flex w-full sm:w-[190px] h-[52px] text-[#4B5563] font-semibold items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 text-slate-900 font-medium transition hover:bg-slate-50 active:scale-[0.98]">
                        Try Demo
                    </a>
                </div>
                <p className="text-[18px] text-[#4B5563]"><span className="font-semibold">Trusted by</span> Scientists, Engineers & Educators Worldwide</p>
            </div>
            <img className="relative top-[-41px] -z-9 fixed w-full h-full" src="src/assets/app-showcase.svg" alt="" />
        </section>
    )
}

const ProductShowCase = () => {
    return (
        <img className="-z-9 absolute top-[0] inset w-full h-full" src="src/assets/app-showcase.svg" alt="" />
    )
}


export default Landing