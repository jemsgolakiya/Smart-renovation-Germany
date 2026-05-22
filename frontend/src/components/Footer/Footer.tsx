import React from "react";
import Text from "../Text/Text";

export function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="bg-white border-t border-gray-200 px-4 sm:px-6 md:px-8 py-4 sm:py-6">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
				<div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 text-center sm:text-left">
					<Text className="text-sm text-gray-600">
						© {currentYear} RenovAlte - Home Renovation Assistant. All rights reserved.
					</Text>
				</div>
			</div>
		</footer>
	);
}

