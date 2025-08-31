import { cn } from "@/lib/utils";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
	className,
	classNames,
	showOutsideDays = false,
	disabled,
	...props
}: CalendarProps) {
	return (
		<DayPicker
			navLayout="around"
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={classNames}
			disabled={disabled}
			{...props}
		/>
	)
}
Calendar.displayName = "Calendar"

export { Calendar };

