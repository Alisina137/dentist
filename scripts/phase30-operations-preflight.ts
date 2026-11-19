/**
 * Operator CLI; accepts ONLY metadata from the independent backup scheduler.
 * Does not create backups, modify databases or inspect patient information.
 *
 * Usage: pnpm qa:operations
 */
import {inspectBackupHeartbeat} from "../apps/api/src/phase30-backup-watchdog.js";
const issues=inspectBackupHeartbeat();
if(issues.length){
 console.error("DANDANLINK_PHASE30_BACKUP_FRESHNESS=FAIL");
 for(const code of issues)console.error("PHASE30_SIGNAL="+code);
 console.error("PH19_INDEPENDENT_BACKUP_RESTORE_APPROVAL=NOT_ESTABLISHED");
 process.exitCode=2;
}else{
 console.info("DANDANLINK_PHASE30_OPERATOR_REPORTED_FRESHNESS=PASS");
 console.info("PH19_INDEPENDENT_BACKUP_RESTORE_APPROVAL=NOT_ESTABLISHED");
}
