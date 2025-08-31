import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
	className,
	classNames,
	showOutsideDays = false,
	disabled,
	...props
}: CalendarProps) {
	const disabledFn = disabled ?? ((date: Date) => date > new Date() || date < new Date('2025-08-28'));
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
				nav: "absolute right-[40px]",
				...classNames,
			}}
			disabled={disabledFn}
			// components={{
			// 	Chevron: ({ orientation }) => 
			// 		orientation === "left" ? 
			// 			<ChevronLeft className="h-4 w-4" /> : 
			// 			<ChevronRight className="h-4 w-4" />
			// }}
			{...props}
		/>
	)
}
Calendar.displayName = "Calendar"

export { Calendar }
