import { message, type MessageDictionary } from './Locale';
// Explicit domain-code aliases. These captions do not enter commands or saves.
const rows=`NOT_ALIVE,PLAYER_DEAD,DEAD|Respawn before acting|Hồi sinh trước khi thao tác
NOT_OWNER,NOT_STRUCTURE_OWNER,NOT_PLAYER_INVENTORY|Only the owner can do this|Chỉ chủ sở hữu được thao tác
OUT_OF_RANGE,TARGET_NOT_ACCESSIBLE|Move closer to the target|Đến gần đối tượng hơn
OUT_OF_WEAPON_RANGE|Move within weapon reach|Đến trong tầm vũ khí
STALE_REVISION,STALE_BUILD_REVISION,STALE_INVENTORY_REVISION,STALE_RESOURCE_REVISION,STALE_WORLDSPACE_REVISION|State changed; select the target again|Trạng thái đã đổi; chọn lại đối tượng
OPERATION_ID_CONFLICT,OPERATION_CONFLICT|Command conflict; try a new action|Lệnh bị trùng; thử thao tác mới
SOURCE_MISSING,TARGET_UNAVAILABLE,FACILITY_MISSING,ANIMAL_MISSING,FORAGE_MISSING,PLAN_MISSING,PLOT_MISSING|Target is no longer available|Đối tượng không còn tồn tại
MATERIALS_MISSING,KIT_UNAVAILABLE|Collect the required materials|Thu thập đủ vật liệu yêu cầu
NO_OUTSTANDING_MATERIALS_AVAILABLE|No required materials in your bag|Túi không có vật liệu còn thiếu
INSUFFICIENT_STAMINA,EXHAUSTED|Rest to recover stamina|Nghỉ để hồi thể lực
TOOL_REQUIRED,FIELD_TOOL_REQUIRED|Carry a usable gathering tool|Mang công cụ thu thập còn dùng được
TOOL_BROKEN|Repair or replace the broken tool|Sửa hoặc thay công cụ hỏng
BROKEN_WEAPON|Repair or replace the broken weapon|Sửa hoặc thay vũ khí hỏng
EQUIP_WEAPON_FIRST|Equip a weapon first|Trang bị vũ khí trước
TARGET_CAPACITY_WEIGHT|Destination weight capacity exceeded|Vượt sức chứa khối lượng của nơi nhận
TARGET_CAPACITY_VOLUME|Destination bulk capacity exceeded|Vượt sức chứa thể tích của nơi nhận
OUTPUT_FULL,TANK_FULL|Output storage is full|Kho đầu ra đã đầy
STACK_LIMIT|No room for another item stack|Không còn chỗ cho chồng đồ mới
STACK_INCOMPATIBLE|These item stacks cannot be combined|Không thể gộp các chồng đồ này
QUANTITY_UNAVAILABLE,INVALID_QUANTITY|Choose an available quantity|Chọn số lượng hiện có
RESOURCE_DEPLETED|Resource exhausted|Tài nguyên đã cạn
HARVEST_MATURE_PLANT_FIRST|Harvest the mature plant first|Thu hoạch cây trưởng thành trước
CROP_NOT_READY,NOT_READY|Not ready yet|Chưa sẵn sàng
CLEAR_PLOT_FIRST|Clear the plot first|Dọn ô trồng trước
WATERING_CAN_REQUIRED|Carry a Watering Can|Mang theo Bình tưới
FIELD_HOE_REQUIRED|Carry a Field Hoe|Mang theo Cuốc dã ngoại
FERTILIZER_UNAVAILABLE|Carry compost to fertilize|Mang phân ủ để bón đất
SOIL_ALREADY_FERTILE|Soil is already fertile|Đất đã đủ màu mỡ
SOIL_PATCH_CAPACITY|Soil patch limit reached|Đã đạt giới hạn vùng đất chăm sóc
LEGACY_GROWTH_PENDING|This saved plant is still growing|Cây trong save đang sinh trưởng
BED_REQUIRED,BED_UNAVAILABLE|A nearby usable bed is required|Cần giường còn dùng được ở gần
CAMPFIRE_REQUIRED|A nearby campfire is required|Cần lửa trại ở gần
FOOD_AND_WATER_REQUIRED|Carry food and clean water|Mang thức ăn và nước sạch
FOOD_FULL,NO_MEANINGFUL_EFFECT|No recovery needed now|Hiện chưa cần hồi phục
COLLECT_WATER_FIRST,NO_COLLECTED_WATER|Collect water first|Thu nước trước
TANK_REQUIRED|Build an irrigation tank first|Xây bồn tưới trước
PEN_UNAVAILABLE,BUILD_NEARBY_PEN|Build a nearby livestock pen|Xây chuồng gia súc ở gần
ALREADY_TAME|Animal is already tame|Động vật đã được thuần hóa
ANIMAL_DEAD|Animal is dead|Động vật đã chết
CARE_UNAVAILABLE|Care is unavailable now|Hiện chưa thể chăm sóc
HOSTILE_NEARBY,HOSTILE_DAMAGE|Threat nearby; seek safety|Có nguy hiểm gần đó; tìm nơi an toàn
ALREADY_RESTING|Already resting|Đang nghỉ
COOLDOWN,REST_COOLDOWN|Wait for the cooldown|Chờ hết thời gian hồi
NEARBY_STATION_REQUIRED,STATION_REQUIRED,NEARBY_FIELD_WORKBENCH_REQUIRED|Move near the required crafting station|Đến gần trạm chế tạo yêu cầu
LANDING_LAB_REQUIRED|Return to the landing laboratory|Quay về phòng thí nghiệm hạ cánh
RESEARCH_PREREQUISITE,PROFESSION_PREREQUISITE|Complete the prerequisite research|Hoàn thành nghiên cứu tiên quyết
ALREADY_RESEARCHED|Already researched|Đã nghiên cứu
ALREADY_SPECIALIZED,SPECIALIZATION_LOCKED|Profession already selected|Đã chọn nghề nghiệp
ALREADY_INSPECTED|Already inspected|Đã khảo sát
INSPECT_SITE_FIRST|Inspect the site first|Khảo sát địa điểm trước
RESTORE_SITE_FIRST|Restore the site first|Khôi phục địa điểm trước
ALREADY_RESTORED|Already restored|Đã khôi phục
ALREADY_BUILT|Already built|Đã xây
FACILITY_LIMIT,PLAN_LIMIT,PLOT_LIMIT,FORAGE_LIMIT|Local object limit reached|Đã đạt giới hạn đối tượng tại chỗ
OCCUPIED_GROUND,PLAN_OVERLAP|Ground is occupied|Mặt đất đã bị chiếm
SITE_BLOCKED_OR_UNEXPLORED|Site blocked or unexplored|Địa điểm bị chặn hoặc chưa khám phá
CONTAINER_NOT_EMPTY|Empty the container first|Dọn hết đồ trong hòm trước
SAME_BLUEPRINT_TYPE|This blueprint is already selected|Đã chọn loại bản dựng này
USE_CANONICAL_DISMANTLE|Use the structure dismantle action|Dùng thao tác tháo dỡ công trình
SUPPLIES_ALREADY_CLAIMED,SUPPLIES_ALREADY_RECOVERED,TARGET_ALREADY_TAKEN|Supplies already collected|Đã thu hồi vật tư
ITEM_FULL_CONDITION|Item is already fully repaired|Đồ đã được sửa hoàn toàn
RETURN_TO_BASE|Return to base|Quay về căn cứ
WRONG_WORLDSPACE|Return to the correct world area|Quay về đúng khu vực thế giới
UNEXPLORED_PORTAL|Explore this entrance first|Khám phá cửa hang này trước
ALREADY_IN_CAVE|Already inside a cave|Đang ở trong hang
NOT_IN_CAVE|You are on the surface|Bạn đang ở trên bề mặt
RETURN_UNAVAILABLE,UNSAFE_RETURN_ANCHOR|Return path unavailable; try another safe position|Chưa có đường về; thử vị trí an toàn khác
RESPAWN_UNAVAILABLE|Respawn is not available yet|Chưa thể hồi sinh
FISHING_ROD_REQUIRED,FISHING_ROD_MISSING|Carry a Field Fishing Rod|Mang theo Cần câu dã ngoại
FISHING_BAIT_REQUIRED|Carry fishing bait|Mang theo mồi câu
FISHING_WATER_REQUIRED,FISHING_STAND_ON_BANK|Stand on the bank beside explored water|Đứng trên bờ cạnh vùng nước đã khám phá
FISHING_LINE_BLOCKED|Fishing line is blocked|Dây câu bị chặn
FISHING_STOCK_RECOVERING|Fish stock is recovering|Nguồn cá đang phục hồi
FISHING_WAIT_FOR_BITE|Wait for a bite|Chờ cá cắn câu
FISHING_MISSED_BITE|Bite missed; cast again|Đã lỡ cá; thả câu lại
FISHING_ALREADY_CAST|Line is already cast|Đã thả câu
FISHING_NO_SESSION|Cast a line first|Thả câu trước
FISHING_INTERRUPTED_MOVE|Fishing interrupted by movement|Di chuyển làm gián đoạn câu cá
FISHING_INTERRUPTED_DAMAGE|Fishing interrupted by damage|Bị thương làm gián đoạn câu cá
FISHING_INTERRUPTED,FISHING_CANCELLED,CANCELED|Action canceled|Đã hủy thao tác
FISHING_SPOT_LIMIT,FISHING_SESSION_LIMIT|Fishing spot is busy|Điểm câu đang bận
FISHING_CAST|Line cast|Đã thả câu
CAVE_ENTERED|Entered cave|Đã vào hang
CAVE_EXITED|Returned to the surface|Đã trở lại bề mặt
ROOT_UPROOTED|Roots recovered|Đã thu gốc
ROOT_REPLANTED,PLANTED|Plant placed|Đã trồng cây
WATERED|Watered|Đã tưới
FERTILIZED|Fertilized|Đã bón đất
SOIL_TILLED|Soil tilled|Đã xới đất
HARVESTED,FORAGED,HUNTED,LOOTED,PRODUCE_COLLECTED|Supplies collected|Đã thu vật tư
TAMED|Animal tamed|Đã thuần hóa
SHEARED|Animal sheared|Đã xén lông
RELEASED|Animal released|Đã thả động vật
FIRE_LIT|Campfire lit|Đã nhóm lửa
TANK_FILLED|Tank filled|Đã đổ đầy bồn
REST_STARTED|Rest started|Đã bắt đầu nghỉ
CRAFTED|Item crafted|Đã chế tạo
MATERIALS_DEPOSITED|Materials deposited|Đã cấp vật liệu
FACILITY_COMPLETED,FACILITY_ACTION_COMPLETED|Facility action completed|Đã hoàn thành thao tác công trình
FACILITY_DISMANTLED,PLAN_REFUNDED|Materials returned to your bag|Đã hoàn vật liệu vào túi
FACILITY_DISMANTLED_TO_STORAGE,PLAN_REFUNDED_TO_STORAGE|Materials returned to storage|Đã hoàn vật liệu vào hòm
FACILITY_RELOCATED,PLAN_MOVED|Placement moved|Đã di chuyển vị trí
PLAN_REPLACED|Blueprint replaced; materials refunded|Đã đổi bản dựng và hoàn vật liệu
PLAN_REPLACED_TO_STORAGE|Blueprint replaced; materials refunded to storage|Đã đổi bản dựng và hoàn vật liệu vào hòm
CLEARED|Cleared|Đã dọn
IDLE|Idle|Đang chờ
MOVING|Moving|Đang di chuyển
NORMAL|Normal|Bình thường
HEAVY|Heavy load|Mang nặng
OVERLOADED|Overloaded|Quá tải
UNPOWERED|No power|Không có điện
DISABLED|Disabled|Đã tắt
RUNNING|Running|Đang chạy
RENEWING|Renewing|Đang tái sinh
warning|Warning|Cảnh báo
critical|Critical|Nguy kịch
health|Health|Sức khỏe
food|Food|Thức ăn
water|Water|Nước
stamina|Stamina|Thể lực
temperature|Temperature|Thân nhiệt`;
const entries=rows.split('\n').map(row=>row.split('|'));
export const statusMessages:MessageDictionary={en:{unavailable:'Action unavailable. Review the requirements and try again.'},vi:{unavailable:'Chưa thể thao tác. Kiểm tra điều kiện rồi thử lại.'}};
const aliases=new Map<string,string>();
for(const [codes,en,vi] of entries){const key='status.'+codes!.split(',')[0];(statusMessages.en as Record<string,string>)[key]=en!;(statusMessages.vi as Record<string,string>)[key]=vi!;for(const code of codes!.split(','))aliases.set(code,key);}
export function statusText(source:string):string|undefined {
  const key=aliases.get(source);
  if(key)return message(statusMessages,key);
  if(/^(INVALID_|UNKNOWN_|.+_UNAVAILABLE$|.+_REJECTED$|.+_FAILED$)/.test(source))return message(statusMessages,'unavailable');
  return undefined;
}
