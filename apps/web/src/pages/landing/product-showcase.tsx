import appShowcase from "@/assets/app-showcase.svg"
import appShowcase2 from "@/assets/showcase-2.svg";

const ProductShowcase = () => {
    return <div className="pt-2">
        <img
            className="-z-[9] -mt-[40px] w-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000 pointer-events-none"
            src={appShowcase}
            alt=""
            aria-hidden="true"
            decoding="async"
        />
        <div className="mt-[-220px]">
            <img
                className="-z-[9] w-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-1000 pointer-events-none"
                src={appShowcase2}
                alt=""
                aria-hidden="true"
                decoding="async"
            />
        </div>
    </div>
}


export default ProductShowcase;
