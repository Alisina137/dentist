/**
 * DandanLink patient-only visual system. Expo built-in fonts remain in use so
 * Dari/Pashto shaping uses the device's native Arabic-script fallback.
 * All screen layouts share these tones, radius and font-size roles.
 */
export const patientTheme={
 colors:{
  brand:"#1467E9",brandDark:"#104FAE",brandSoft:"#E9F2FF",
  ink:"#142F51",inkSecondary:"#354B68",muted:"#5C708C",
  background:"#F4F7FC",surface:"#FFFFFF",stroke:"#DFE8F4",
  green:"#087D61",greenSoft:"#E6F6EF",
  amber:"#8B5C17",amberSoft:"#FFF4DE",
  danger:"#AC3443",dangerSoft:"#FFF0F2",
  inactive:"#8B9DB5"
 },
 radius:{card:20,control:14,chip:999,small:10},
 type:{
  hero:28,page:22,section:19,cardTitle:16,
  body:14,secondary:13,label:13,caption:12,minimum:12
 },
 spacing:{screen:18,section:18,card:18,control:12},
 shadow:{shadowColor:"#1B3E72",shadowOffset:{width:0,height:4},
  shadowOpacity:.045,shadowRadius:14,elevation:2},
 controlHeight:48
} as const;
