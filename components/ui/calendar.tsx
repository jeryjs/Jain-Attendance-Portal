import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
	className,
	classNames,
	showOutsideDays = false,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
				month: "space-y-4",
				caption: "flex justify-center pt-1 relative items-center",
				caption_label: "text-sm font-medium",
				nav: "absolute right-[40px] flex items-center space-x-1",
				nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
				month_grid: "w-full",
				month_caption: "mt-[-15px]",
				table: "w-full border-collapse space-y-1",
				head_row: "flex",
				head_cell: "text-muted-foreground w-9 font-normal text-sm",
				row: "flex w-full mt-2",
				cell: "h-9 w-9 text-center text-sm p-0",
				day: cn(
					"h-9 w-9 p-0 font-normal hover:bg-accent hover:text-accent-foreground text-center"
				),
				day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
				day_today: "bg-accent text-accent-foreground",
				day_outside: "text-muted-foreground opacity-50",
				day_disabled: "text-muted-foreground opacity-50",
				...classNames,
			}}
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
