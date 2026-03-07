import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="w-full border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-center">
          {/* Left Image */}
          <div className="relative h-24 w-24 shrink-0 md:h-28 md:w-28">
            <Image
              src="/foundation-logo.jpeg"
              alt="Foundation Logo"
              fill
              priority
              sizes="(max-width: 768px) 96px, 112px"
              className="object-contain"
            />
          </div>

          {/* Right Text - center aligned; org block width tied to first line */}
          <div className="w-full max-w-2xl text-center">
            <div className="inline-block text-center">
              <p className="text-base font-semibold text-orange-600 md:text-lg">
                The Sri Sathya Sai Global Council Foundation, Inc. (EIN: 88-0716268)
              </p>
              <p className="mt-1 text-[11px] leading-snug text-gray-600 md:text-xs">
                is a U.S.-based 501(c)(3) nonprofit that
                <br />
                supports global humanitarian and community service
                <br />
                initiatives inspired by the teachings of Bhagawan Sri Sathya Sai Baba.
              </p>
            </div>
            <p className="mt-4 text-gray-700">
              For any general questions, please reach out to
            </p>
            <p className="mt-1 font-medium text-blue-600">
              LoveSaiServeSai@gmail.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}