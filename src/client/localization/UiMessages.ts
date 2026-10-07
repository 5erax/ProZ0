import { bindLocalized, message, type MessageDictionary } from './Locale';
import { statusText } from './StatusMessages';
// Authored glossary. Lookup is exact and only called at source-owned UI boundaries.
// Player/profile/chat strings never pass through this dictionary.
const glossary = `Crops and livestock|Cây trồng và vật nuôi
Exploration guidance|Hướng dẫn khám phá
Discovered locations|Địa điểm đã khám phá
Observed facts|Thông tin đã quan sát
INVALID|Vị trí chưa hợp lệ
VALID|Vị trí hợp lệ
Consume|Dùng
Consume available food or water|Dùng thức ăn hoặc nước hiện có
not equipped|chưa trang bị
Industry|Công nghiệp
Kit|Bộ lắp
MIST RAIN|Mưa sương
DRY WIND|Gió khô
BASE|Căn cứ
DETAIL|Chi tiết
NEAR|Gần
MID|Khoảng cách vừa
FAR|Xa
Skin|Trang phục
Base guide|Hướng dẫn căn cứ
CLEAR|Trời quang
COLD RAIN|Mưa lạnh
COLD RAIN · FORECAST|Dự báo mưa lạnh
Low|Thấp
Carry a Stone Field Tool · open Craft [C] to make one|Cần công cụ đá · mở Chế tạo [C] để làm
Choose ground near the Landing Module or Habitat to expand your base|Chọn vị trí gần mô-đun hạ cánh hoặc phòng ở để mở rộng căn cứ
Position obstructed; choose clear ground|Vị trí bị chắn; chọn khoảng đất trống
Connector is no longer valid; choose another|Điểm nối không còn hợp lệ; chọn điểm nối khác
Connector is occupied; choose another|Điểm nối đã được sử dụng; chọn điểm nối khác
Carry a building kit; open Craft [C] to make one|Cần kit xây dựng trong túi; mở Chế tạo [C] để làm
Item or target changed; reopen the panel and select again|Vật phẩm hoặc đối tượng đã thay đổi; mở lại bảng để chọn lại
Complete the prerequisite research to unlock|Hoàn thành nghiên cứu trước đó để mở khóa
Research is complete for the whole room|Nghiên cứu đã hoàn thành cho cả phòng
Move near a Workbench to craft this recipe|Đến gần bàn chế tạo để làm công thức này
Save failed; try again before leaving the room|Chưa lưu được; thử lại trước khi rời phòng
Only explored terrain is shown · yellow: you · blue: teammates|Chỉ hiện địa hình đã khám phá · vàng: bạn · xanh: đồng đội
Change profession at a laboratory when research and exploration requirements are met.|Có thể đổi nghề tại phòng thí nghiệm khi đủ điều kiện nghiên cứu và khám phá.
WASD move · E interact · Space attack · I inventory · C craft · B build · M map · U research · P professions · J journal · Enter chat · Escape close. Settings contains world saves and invitations. Voice starts only when you choose it and grant microphone permission.|WASD di chuyển · E tương tác gần bạn · Space tấn công · I túi đồ · C chế tạo · B xây dựng · M bản đồ · U nghiên cứu · P nghề · J nhật ký · Enter chat · Escape đóng. Cài đặt chứa lưu thế giới và lời mời. Voice chỉ bật khi bạn chọn và cho phép mic.
Click Chat to allow audio playback|Bấm vào Chat để cho phép phát âm thanh
Voice cannot connect on this network; chat is still available.|Voice không kết nối qua mạng này; bạn vẫn có thể chat.
Allow microphone access to talk. Direct voice may be blocked by the network.|Cho phép mic nếu bạn muốn nói chuyện. Voice trực tiếp có thể bị mạng chặn.
Microphone unavailable; check browser permission. Chat is still available.|Chưa bật được mic; kiểm tra quyền trình duyệt. Chat vẫn dùng được.
Voice interrupted; toggle voice to retry.|Voice bị gián đoạn; tắt/bật voice để thử lại.
Your bag is too heavy. Store items and return; these supplies will remain here.|Túi quá nặng. Cất bớt đồ rồi quay lại; vật liệu vẫn còn ở đây.
Your bag has no space. Store items and return; these supplies will remain here.|Túi không còn chỗ. Cất bớt đồ rồi quay lại; vật liệu vẫn còn ở đây.
No inspected sites yet. Explore outward; inspect visible landmarks nearby.|Chưa khảo sát địa điểm nào. Khám phá xung quanh rồi khảo sát địa danh đã thấy ở gần.
Blueprint changed. Your bag was full; surplus materials were returned to an accessible nearby storage crate.|Đã đổi bản dựng. Túi đầy nên vật liệu thừa được trả vào rương gần đó có thể tiếp cận.
Blueprint cancelled. Your bag was full; materials were returned to an accessible nearby storage crate.|Đã hủy bản dựng. Túi đầy nên vật liệu được trả vào rương gần đó có thể tiếp cận.
Building dismantled. Your bag was full; materials were returned to an accessible nearby storage crate.|Đã tháo công trình. Túi đầy nên vật liệu được trả vào rương gần đó có thể tiếp cận.
Blueprint type changed. Shared materials are kept; surplus materials returned to your bag.|Đã đổi loại bản dựng. Vật liệu dùng chung được giữ lại; vật liệu thừa trả về túi.
Use the existing building dismantle action; empty storage first.|Dùng thao tác tháo công trình; lấy hết đồ trong rương trước.
Rest started. Stay still and safe; closing this panel wakes you up.|Đã bắt đầu nghỉ. Đứng yên ở nơi an toàn; đóng bảng này sẽ thức dậy.
Place a blueprint first. Bring supplies later, contribute what you carry, then complete it. Moving keeps contributed materials; cancel refunds them when your bag has room.|Đặt bản dựng trước. Mang vật liệu đến sau, đóng góp đồ đang có rồi hoàn tất. Di chuyển giữ nguyên vật liệu đã góp; hủy sẽ hoàn trả khi túi còn chỗ.
Automatically used for resource gathering. Keep it in your bag; it is not a weapon.|Tự dùng khi thu thập tài nguyên. Giữ trong túi; đây không phải vũ khí.
. Slows exposure; does not instantly restore body temperature.|. Làm chậm tác động môi trường; không phục hồi thân nhiệt ngay lập tức.
. Water and seasonal soil growth rules apply.|. Sinh trưởng phụ thuộc nước và đất theo mùa.
Fish explored water with a Field Fishing Rod and Plant Fishing Bait. Cook at a campfire; raw fish is not directly consumable.|Câu ở vùng nước đã khám phá bằng cần câu và mồi thực vật. Nấu tại lửa trại; không thể ăn cá sống trực tiếp.
Bag full. Store some items; harvest and loot are preserved.|Túi đầy. Cất bớt đồ; sản phẩm thu hoạch và chiến lợi phẩm được giữ lại.
Fish population depleted or reserved; let this area recover.|Cá đã cạn hoặc đang được người khác câu; chờ khu vực hồi phục.
Uprooting removes this patch permanently; replant the root elsewhere.|Thu gốc sẽ xóa bụi cây tại đây; trồng lại gốc ở nơi khác.
 percentage points. This condition follows your current body temperature; it has no fixed expiry.| điểm phần trăm. Trạng thái phụ thuộc thân nhiệt hiện tại; không có thời hạn cố định.
Stop sprinting and attacking. Stamina regenerates after the spending delay; resolve thirst, hunger, temperature and heavy carrying if recovery is slow.|Dừng chạy nhanh và tấn công. Thể lực hồi sau thời gian chờ; xử lý khát, đói, thân nhiệt và túi quá nặng nếu hồi chậm.
% (combined authority result, capped at 100%). Conditions change when the underlying stat recovers; no expiry timer is invented.|% (tổng tác động, tối đa 100%). Trạng thái thay đổi khi chỉ số liên quan hồi phục; không có bộ đếm hết hạn.
World saved — bookmark this page to return; Continue is unavailable.|Đã lưu thế giới — đánh dấu trang này để quay lại; chưa thể dùng Tiếp tục.
Delete this shared world permanently? Export a backup first and disconnect all players.|Xóa vĩnh viễn thế giới chung này? Xuất bản sao lưu và ngắt kết nối mọi người trước.
The host owns the shared world save. An invitation admits up to three players; your solo worlds stay separate.|Chủ phòng sở hữu save thế giới chung. Lời mời cho phép tối đa ba người; thế giới solo được lưu riêng.
Only the host can save this shared world|Chỉ chủ phòng có thể lưu thế giới chung
Invitation copied · maximum 3 players|Đã sao chép lời mời · tối đa 3 người
Nearby storage · move a stack in either direction|Rương gần đây · chuyển chồng đồ theo cả hai chiều
Stand beside a storage crate to put supplies away.|Đứng cạnh rương để cất vật liệu.
Choose a facility, close this panel, then click the ground nearby. Building uses a crafted kit.|Chọn công trình, đóng bảng rồi nhấp nền đất gần đó. Xây dựng dùng kit đã chế tạo.
Room full or saved identity rejected. Rejoin with your original invitation.|Phòng đầy hoặc danh tính lưu bị từ chối. Vào lại bằng lời mời ban đầu.
Connection lost · reconnecting to your colonist…|Mất kết nối · đang kết nối lại nhân vật…
Click nearby ground to place facility|Nhấp nền đất gần đây để đặt công trình
Craft a storage kit: 4 Timber + 2 Cordage.|Chế tạo kit rương: 4 gỗ + 2 dây.
Place a storage crate on explored dry ground near your base.|Đặt rương trên đất khô đã khám phá gần căn cứ.
Stand beside your crate and open Inventory to move supplies.|Đứng cạnh rương rồi mở Túi đồ để chuyển vật liệu.
Explore visible landmarks; inspect them from the Journal.|Khám phá địa danh đã thấy; khảo sát trong Nhật ký.
Recording stopped. Export your record below.|Đã dừng ghi. Xuất bản ghi bên dưới.
Start recording and play for a few moments first.|Bắt đầu ghi rồi chơi một lúc trước.
Ten-minute record complete. Export it when ready.|Đã hoàn tất bản ghi mười phút. Xuất khi sẵn sàng.
Respawn complete|Đã hồi sinh
Authoritative death consequence pending|Đang xử lý hậu quả khi chết
No active Death Cache|Không có túi đồ khi chết
Locate the Ruin|Tìm phế tích
Inspect the Ruin|Khảo sát phế tích
Return alive to Landing Module or Habitat Room|Sống sót trở về mô-đun hạ cánh hoặc phòng ở
Power Unit + Condenser present|Có bộ phát điện và máy ngưng tụ nước
Interact while powered|Tương tác khi có điện
Collect 1 Clean Water|Lấy 1 nước sạch
Inventory / Storage|Túi đồ / Rương
Map / Recovery|Bản đồ / Thu hồi
Shared exploration unavailable|Chưa có dữ liệu khám phá chung
Uninvestigated Ruin|Phế tích chưa khảo sát
Investigated Ruin|Phế tích đã khảo sát
Ruin unknown|Chưa biết phế tích
Progression|Tiến triển
Shared Discovery|Khám phá chung
UNLOCKED|ĐÃ MỞ
LOCKED|CHƯA MỞ
INCOMPLETE|CHƯA HOÀN THÀNH
COMMAND REJECTED|Không thể thực hiện thao tác
STALE / WORLD STATE CHANGED|Trạng thái đã đổi; chọn lại đối tượng
WORLD STATE CHANGED / POSITION TAKEN|Vị trí vừa được sử dụng; chọn vị trí khác
WORLD STATE CHANGED / TARGET TAKEN|Đối tượng vừa được lấy; chọn lại
INVENTORY WEIGHT LIMIT|Vượt sức chứa khối lượng
INVENTORY VOLUME LIMIT|Vượt sức chứa thể tích
STACK FULL|Chồng đồ đã đầy
INSUFFICIENT MATERIAL|Chưa đủ vật liệu
MISSING / WRONG TOOL|Cần công cụ phù hợp
ITEM BROKEN|Vật phẩm đã hỏng
TOO FAR|Đến gần đối tượng hơn
INVALID REPAIR TARGET|Chọn vật phẩm có thể sửa
ITEM ALREADY FULL CONDITION|Vật phẩm không cần sửa
UNEXPLORED AREA|Khám phá khu vực trước
INVALID TERRAIN|Chọn nền đất phù hợp
WATER / NON-BUILDABLE SURFACE|Không thể xây trên mặt nước
OBSTRUCTED|Chọn vị trí không bị chắn
STRUCTURE OVERLAP|Vị trí chồng lên công trình
BLOCKS SPAWN|Không được chặn điểm hồi sinh
BLOCKS REQUIRED DOOR / CONNECTOR|Không được chặn cửa hoặc đầu nối
OUTSIDE BASE BUILD ZONE|Đến vùng xây dựng căn cứ
CONNECTOR REQUIRED|Cần đầu nối phòng ở
INVALID CONNECTOR|Chọn đầu nối phù hợp
BUILD LIMIT REACHED|Đã đạt giới hạn công trình
WORLD STATE CHANGED|Trạng thái đã thay đổi
INSUFFICIENT POWER|Chưa đủ công suất điện
INVALID BUILD LOCATION|Chọn vị trí xây hợp lệ
CRITICAL|Nguy kịch
CRITICAL COLD|Rét nguy kịch
SEVERE COLD|Rét nặng
CRITICAL HEAT|Nóng nguy kịch
SEVERE HEAT|Nóng nặng
COLD|Lạnh
HOT|Nóng
ACTIVE|Đang diễn ra
FORECAST|Dự báo
DEAD|Đã chết
ALIVE|Còn sống
BROKEN|Hỏng
MARKER_LIMIT|Đã đạt giới hạn 64 dấu tài nguyên
Mark resource on map|Đánh dấu tài nguyên trên bản đồ
Remove resource marker|Xóa dấu tài nguyên
AUTO-USED WHEN GATHERING · NOT A WEAPON|TỰ DÙNG KHI THU HOẠCH · KHÔNG PHẢI VŨ KHÍ
Repair selected item [R]|Sửa vật phẩm đã chọn [R]
Settings|Cài đặt
Close|Đóng
Inventory|Túi đồ
Map|Bản đồ
Craft|Chế tạo
Crafting|Chế tạo
Locked|Chưa mở khóa
Click to interact|Nhấp để tương tác
players|người chơi
Build base|Xây căn cứ
Journal|Nhật ký
Research|Nghiên cứu
Professions|Nghề nghiệp
Homestead|Nông trại
Equipment|Trang bị
Equipment help|Hướng dẫn trang bị
Equipment and character preview|Trang bị và xem nhân vật
Equipment and character status|Trang bị và trạng thái nhân vật
Health|Sức khỏe
Food|Lương thực
Water|Nước
Stamina|Thể lực
Temperature|Nhiệt độ
Body temperature index|Chỉ số thân nhiệt
Character status|Trạng thái nhân vật
Current|Hiện tại
Healthy|Khỏe mạnh
Hydrated|Đủ nước
Fed|Đủ thức ăn
Comfortable|Dễ chịu
Hungry|Đói
Dehydrated|Thiếu nước
Injured|Bị thương
Exhausted|Kiệt sức
Normal|Bình thường
Overloaded|Quá tải
Heavy carrying|Mang nặng
Cold exposure|Nhiễm lạnh
Heat exposure|Nhiễm nóng
No adverse conditions|Không có trạng thái bất lợi
Head|Đầu
Torso|Thân
Legs|Chân
Feet|Bàn chân
Accessory|Phụ kiện
Tool|Công cụ
Weapon|Vũ khí
Common|Phổ thông
Uncommon|Ít gặp
Rare|Hiếm
Epic|Sử thi
Legendary|Huyền thoại
Mythic|Thần thoại
Rarity: |Độ hiếm:\u0020
Equip|Trang bị
Equipped|Đang trang bị
Unequip|Tháo trang bị
Equip / Unequip [X]|Trang bị / tháo [X]
Equip selected item [X]|Trang bị vật phẩm đã chọn [X]
Drop selected quantity [G]|Thả số lượng đã chọn [G]
Move one|Chuyển một
Move stack|Chuyển cả chồng
Stack matching items|Gộp vật phẩm cùng loại
Properties, sources and crafting uses|Đặc tính, nguồn và công dụng chế tạo
Per item: |Mỗi vật phẩm:\u0020
Source: |Nguồn:\u0020
Ingredient for: |Nguyên liệu cho:\u0020
Restores: |Phục hồi:\u0020
Durability |Độ bền\u0020
Durability now: |Độ bền hiện tại:\u0020
Damage |Sát thương\u0020
Attack costs |Chi phí tấn công\u0020
Gather time: |Thời gian thu thập:\u0020
Gather|Thu thập
Gather |Thu thập\u0020
Inspect|Kiểm tra
Inspect nearby|Kiểm tra gần đây
Interact|Tương tác
Harvest|Thu hoạch
Harvest |Thu hoạch\u0020
Hunt|Săn
Plant |Trồng\u0020
Forage |Hái\u0020
Collect |Lấy\u0020
Recovery|Thu hồi
Dropped items|Đồ đã thả
Death cache|Kho đồ sau khi chết
Death Cache|Kho đồ sau khi chết
Most Recent Death Cache|Kho đồ sau khi chết gần nhất
Cave|Hang động
Cave entrance|Cửa hang
Cave exit|Lối ra hang
Cave · finite minerals|Hang · khoáng sản hữu hạn
Finite cave deposit|Vỉa khoáng hữu hạn trong hang
Finite deposit exhausted|Vỉa khoáng đã cạn
Exhausted · does not regrow|Đã cạn · không tái sinh
Finite minerals · bring a field tool|Khoáng sản hữu hạn · mang theo công cụ dã ngoại
Exit returns to the entrance|Thoát để trở về cửa hang
Explored interior only · walls and unknown cells remain opaque|Chỉ hiện phần hang đã khám phá · vách và ô chưa biết được che kín
Inventory and survival remain active|Túi đồ và chỉ số sinh tồn vẫn hoạt động
Left click / E: mine within 1.25 m|Nhấp trái / E: đào trong phạm vi 1,25 m
Left click / E: recover cargo|Nhấp trái / E: lấy lại đồ
Left click / E: interact|Nhấp trái / E: tương tác
Left click / E: manage|Nhấp trái / E: quản lý
Left click / E: explore|Nhấp trái / E: khám phá
Left click / E: interact · F: manage|Nhấp trái / E: tương tác · F: quản lý
Entity statistics|Thông số vật thể
Close entity statistics|Đóng thông số vật thể
Building|Công trình
Blueprint|Bản dựng
Compact HUD|HUD thu gọn
Growth|Sinh trưởng
Moisture|Độ ẩm
Storage|Lưu trữ
Inventory actions|Thao tác túi đồ
Shelter|Chỗ trú
Utilities|Tiện ích
Equipment effects|Hiệu ứng trang bị
Split selected quantity|Tách số lượng đã chọn
MORNING|Buổi sáng
AFTERNOON|Buổi chiều
EVENING|Buổi tối
NIGHT|Ban đêm
Plots|Ô trồng
Livestock|Vật nuôi
Nearby resources|Tài nguyên gần đây
Close [Esc]|Đóng [Esc]
Exploration site|Địa điểm khám phá
Wildlife|Động vật hoang dã
Consumable|Vật phẩm tiêu dùng
Domestic|Vật nuôi
Adult|Trưởng thành
Young|Con non
Male|Đực
Female|Cái
Carcass|Xác động vật
Spring|Mùa xuân
Summer|Mùa hè
Autumn|Mùa thu
Winter|Mùa đông
Loam|Đất thịt
Sand|Đất cát
Clay|Đất sét
Peat|Đất than bùn
Rocky|Đất nhiều đá
Moisture: |Độ ẩm:\u0020
Local soil: |Đất tại đây:\u0020
Local ecology: |Sinh thái tại đây:\u0020
Early growth|Mới mọc
Growing|Đang lớn
Regrowing · |Tái sinh ·\u0020
Early growth · roots present|Mới mọc · còn rễ
Growing · roots present|Đang lớn · còn rễ
Maximum growth reached · best yield|Đã trưởng thành · sản lượng tốt nhất
Growth paused · water needed|Sinh trưởng tạm dừng · cần nước
Needs water|Cần nước
Next stage ≈ |Mốc tiếp theo ≈\u0020
Regrows in |Tái sinh sau\u0020
Water roots · 1 Clean Water|Tưới rễ · 1 Nước sạch
Uproot · Field Hoe|Đào rễ · Cuốc dã ngoại
Empty|Trống
Available|Sẵn sàng
Complete|Hoàn thành
Cancel & refund|Hủy và hoàn vật liệu
Dismantle & refund|Tháo dỡ và hoàn vật liệu
Move / rotate|Di chuyển / xoay
Change blueprint type|Đổi loại bản dựng
Change & refund surplus|Đổi và hoàn phần dư
Contribute|Góp vật liệu
Plan|Đặt bản dựng
Prepare kit|Chuẩn bị bộ lắp ráp
Place|Đặt
Place [Enter]|Đặt [Enter]
Cancel [Esc]|Hủy [Esc]
Move|Di chuyển
Release|Thả
Rest|Nghỉ ngơi
Rest at landing · 5 food + 5 water|Nghỉ tại điểm hạ cánh · 5 thức ăn + 5 nước
Observed ecology history|Lịch sử sinh thái đã quan sát
Facilities & Landing Lab|Công trình và phòng thí nghiệm hạ cánh
Field craft|Chế tạo dã ngoại
Living world|Thế giới sống
Landing Module|Mô-đun hạ cánh
Landing Lab|Phòng thí nghiệm hạ cánh
Landing Laboratory|Phòng thí nghiệm hạ cánh
Landing Lab · interact|Phòng thí nghiệm hạ cánh · tương tác
Landing Grassland|Đồng cỏ hạ cánh
Mist Marsh|Đầm sương
Ochre Badlands|Vùng đất khô vàng
Timber|Gỗ
Plant Fiber|Sợi thực vật
Cordage|Dây thừng
Stone|Đá
Metal Ore|Quặng kim loại
Clean Water|Nước sạch
Edible Plant|Thực vật ăn được
Stone Field Tool|Công cụ đá dã ngoại
Field Hoe|Cuốc dã ngoại
Watering Can|Bình tưới
Field Fishing Rod|Cần câu dã ngoại
Plant Fishing Bait|Mồi câu thực vật
Grain|Ngũ cốc
Flax|Lanh
Root Crop|Cây lấy củ
Medicinal Herbs|Thảo dược
Herb|Thảo mộc
Berry Bush|Bụi quả mọng
Meadow Grass|Cỏ đồng
Reed|Sậy
Moss|Rêu
Basic Spear|Giáo cơ bản
Reinforced Spear|Giáo gia cố
Alloy Spear|Giáo hợp kim
Relic Spear|Giáo di vật
Mythic Relic Spear|Giáo di vật thần thoại
Thermal Wrap|Áo giữ nhiệt
Warm Cloak|Áo choàng ấm
Fur Trousers|Quần lông
Leather Boots|Ủng da
Leather Vest|Áo da
Explorer Hat|Mũ thám hiểm
Field Dressing|Băng cứu thương dã ngoại
Herbal Salve|Thuốc mỡ thảo dược
Repair Patch|Miếng vá sửa chữa
Field Repair Patch|Miếng vá dã ngoại
Ancient Alloy Shard|Mảnh hợp kim cổ
Animal Feed|Thức ăn vật nuôi
Raw Meat|Thịt sống
Cooked Meat|Thịt chín
Smoked Meat|Thịt hun khói
Raw Hide|Da sống
Leather|Da thuộc
Bone|Xương
Wool|Len
Egg|Trứng
Eggs|Trứng
Milk|Sữa
Charcoal|Than củi
Salt|Muối
Salt Crystal|Tinh thể muối
Fertilizer|Phân bón
Compost|Phân ủ
Bone Compost|Phân ủ từ xương
Flour|Bột
Bread|Bánh mì
Fired Bricks|Gạch nung
Stone Outcrop|Mỏ đá lộ thiên
Metal Ore Node|Vỉa quặng kim loại
Timber Source|Cây lấy gỗ
Fiber Plant|Cây lấy sợi
Food Plant|Cây thực phẩm
Potable Water Source|Nguồn nước uống
Clay Bank|Vỉa đất sét
Rabbit|Thỏ
Chicken|Gà
Goat|Dê
Boar|Lợn rừng
Fox|Cáo
Wolf|Sói
Territorial Predator|Thú săn mồi giữ lãnh thổ
Passive Wildlife|Động vật hiền lành
Campfire|Lửa trại
Camp Bed|Giường dã ngoại
Field Cabin|Nhà dã ngoại
Field Workbench|Bàn chế tạo dã ngoại
Field Laboratory|Phòng thí nghiệm dã ngoại
Field Greenhouse|Nhà kính dã ngoại
Livestock Pen|Chuồng gia súc
Poultry Coop|Chuồng gia cầm
Rain Collector|Bộ hứng mưa
Irrigation Tank|Bồn tưới
Compost Bin|Thùng ủ phân
Clay Kiln|Lò nung đất sét
Hand Grain Mill|Cối xay ngũ cốc thủ công
Smoking Rack|Giàn hun khói
Field Tannery|Xưởng thuộc da dã ngoại
Trail Beacon|Cột đánh dấu đường
Compact Power Unit|Bộ phát điện nhỏ
Atmospheric Water Condenser|Máy ngưng tụ nước khí quyển
Attached Habitat Room|Phòng ở gắn mô-đun
Storage Crate|Thùng lưu trữ
Storage Kit|Bộ lắp thùng lưu trữ
Machine Kit|Bộ lắp máy
Habitat Kit|Bộ lắp phòng ở
Power Unit Kit|Bộ lắp nguồn điện
Workbench|Bàn chế tạo
Water collected.|Đã lấy nước.
Materials gathered.|Đã thu thập vật liệu.
Item crafted and added to your bag.|Đã chế tạo và cất vật phẩm vào túi.
Outpost facility completed.|Đã hoàn thành công trình dã ngoại.
Materials contributed. You can add more later.|Đã góp vật liệu. Có thể góp tiếp sau.
Blueprint placed. Bring materials and contribute what you carry.|Đã đặt bản dựng. Mang vật liệu đến và góp phần đang có.
Blueprint cancelled. Contributed materials returned to your bag.|Đã hủy bản dựng. Vật liệu đã góp được trả vào túi.
Blueprint moved. Contributed materials are kept.|Đã di chuyển bản dựng. Vật liệu đã góp được giữ lại.
Building moved. Stored items and production are preserved.|Đã di chuyển công trình. Đồ lưu trữ và sản xuất được giữ lại.
Facility removed. Building materials returned to your bag.|Đã tháo công trình. Vật liệu xây dựng được trả vào túi.
Bring the required materials.|Mang đủ vật liệu cần thiết.
Gather the missing materials first.|Thu thập phần vật liệu còn thiếu trước.
Move closer to this blueprint or facility.|Đến gần bản dựng hoặc công trình hơn.
Move closer to this site.|Đến gần địa điểm này hơn.
Not enough stamina. Recover before striking again.|Không đủ thể lực. Hồi phục trước khi đánh tiếp.
Move within striking distance of this animal.|Đến gần động vật trong phạm vi tấn công.
Equip a spear in inventory before hunting.|Trang bị giáo trong túi trước khi săn.
Repair this broken item before equipping it.|Sửa vật phẩm đã hỏng trước khi trang bị.
Drag a matching item from your bag here, or select it and use Equip.|Kéo vật phẩm phù hợp từ túi vào đây, hoặc chọn và bấm Trang bị.
Bonuses require equipped, owned, unbroken gear. Passive gear does not lose durability simply for being worn.|Hiệu ứng cần trang bị thuộc sở hữu và chưa hỏng. Trang bị thụ động không hao độ bền chỉ vì được mặc.
Choose explored water within 4 m.|Chọn vùng nước đã khám phá trong phạm vi 4 m.
Craft a Field Fishing Rod first.|Chế tạo Cần câu dã ngoại trước.
Craft a Field Hoe first.|Chế tạo Cuốc dã ngoại trước.
Craft a Watering Can first.|Chế tạo Bình tưới trước.
Craft or carry Plant Fishing Bait before casting.|Chế tạo hoặc mang Mồi câu thực vật trước khi thả câu.
Bait cast. Stay still and watch for the bite.|Đã thả mồi. Đứng yên và chờ cá cắn.
Reel [Space]|Kéo câu [Space]
Fish nearby water|Câu ở vùng nước gần đây
Cast here · 1 bait|Thả câu tại đây · 1 mồi
Fishing cancelled. The cast bait is spent.|Đã hủy câu. Mồi đã thả không được hoàn lại.
Fishing cancelled because you moved. The cast bait is spent.|Đã hủy câu vì di chuyển. Mồi đã thả không được hoàn lại.
Fishing cancelled because you took damage.|Đã hủy câu vì bị thương.
No room to land the fish. Free bag space before the bite window closes.|Không đủ chỗ cất cá. Dọn túi trước khi hết thời gian kéo câu.
Plot ready: choose a seed.|Ô đất đã sẵn sàng: chọn hạt giống.
Collect meat, hide & bone|Lấy thịt, da và xương
Feed & water · 1 each|Cho ăn và nước · mỗi loại 1
Feed + water · 1 Edible Plant + 1 Clean Water|Cho ăn và nước · 1 Thực vật ăn được + 1 Nước sạch
Fertilize crop · 1 Fertilizer|Bón cây · 1 Phân bón
Fertilize · 1 compost|Bón đất · 1 Phân ủ
Fill · 1 water → 4 irrigation|Nạp · 1 nước → 4 lượt tưới
Clear crop|Dọn cây
Empty soil|Đất trống
Empty plot|Ô trống
Animal fed. Adults with a fed partner can breed.|Đã cho ăn. Con trưởng thành có bạn ghép đủ thức ăn có thể sinh sản.
Animal moved into your pen.|Đã chuyển động vật vào chuồng.
Animal down: collect the meat.|Động vật đã gục: lấy thịt.
Build and stand near the required station.|Xây và đứng gần trạm cần thiết.
Inspect this site first.|Kiểm tra địa điểm này trước.
Explore this site and clear buildings from its approach first.|Khám phá địa điểm và dọn công trình trên đường tiếp cận trước.
Only the builder can move this building.|Chỉ người xây mới được di chuyển công trình.
Leave this building before moving it.|Rời công trình trước khi di chuyển nó.
Buildings changed. Choose the position again.|Công trình đã thay đổi. Chọn lại vị trí.
Choose a position clear of other blueprints and facilities.|Chọn vị trí không đè lên bản dựng hoặc công trình khác.
Choose a different facility to change this blueprint.|Chọn công trình khác để đổi bản dựng này.
No water collected yet. This collector fills during local rain.|Chưa có nước. Bộ hứng được nạp khi có mưa tại đây.
Collect the stored water before dismantling this collector.|Lấy hết nước đã trữ trước khi tháo bộ hứng.
Contribute the remaining materials before completing this facility.|Góp đủ phần vật liệu còn lại trước khi hoàn thành công trình.
Check your inventory before repeating the last action.|Kiểm tra túi đồ trước khi lặp lại thao tác vừa rồi.
Action rejected|Thao tác bị từ chối
Save world [L]|Lưu thế giới [L]
Reopen saved world|Mở lại thế giới đã lưu
Save status|Trạng thái lưu
World saved|Đã lưu thế giới
Save failed|Lưu thất bại
Copy seed|Sao chép seed
Seed copied|Đã sao chép seed
Copy invitation|Sao chép lời mời
Clipboard unavailable|Không dùng được bộ nhớ tạm
Enable sound|Bật âm thanh
Mute sound|Tắt âm thanh
Rain audio unavailable. Enable sound to retry.|Âm thanh mưa chưa sẵn sàng. Bật âm thanh để thử lại.
Volume|Âm lượng
Controls [H]|Điều khiển [H]
Toggle fullscreen|Bật / tắt toàn màn hình
Fullscreen|Toàn màn hình
Display resolution|Độ phân giải
Display size |Kích thước hiển thị\u0020
Fit window|Vừa cửa sổ
E: interact|E: tương tác
Left click / E: |Nhấp trái / E:\u0020
Enter |Vào\u0020
Exit |Thoát\u0020
 · blueprint| · bản dựng
 · manage| · quản lý
 · cut roots| · rễ sau thu hoạch
 · growing roots| · rễ đang lớn
 · growth | · sinh trưởng\u0020
 · yield | · sản lượng\u0020
 · Moisture | · Độ ẩm\u0020
 · Year | · Năm\u0020
 · Escape cancel| · Escape để hủy
 · R rotate · Escape cancel| · R xoay · Escape để hủy
 · Station: | · Trạm:\u0020
 · none| · không có
 · range | · phạm vi\u0020
 · maximum durability: | · độ bền tối đa:\u0020
 · condition | · độ bền\u0020
 · use takes | · thời gian dùng\u0020
 stamina · cooldown | thể lực · hồi chiêu\u0020
 active seconds.| giây hoạt động.
 by hand| bằng tay
 kg. Volume: | kg. Thể tích:\u0020
 bulk units| đơn vị thể tích
 s · durability loss per hit | giây · độ bền mất mỗi đòn\u0020
Next page [PgDn]|Trang sau [PgDn]
Previous page [PgUp]|Trang trước [PgUp]
FIELD CRAFT|CHẾ TẠO DÃ NGOẠI
FACILITIES & LANDING LAB|CÔNG TRÌNH VÀ PHÒNG THÍ NGHIỆM HẠ CÁNH
EXPEDITION · BLUEPRINTS & FIELD CRAFT|THÁM HIỂM · BẢN DỰNG VÀ CHẾ TẠO DÃ NGOẠI
HOMESTEAD · |NÔNG TRẠI ·\u0020
CAVE MAP · |BẢN ĐỒ HANG ·\u0020
MAP · DISCOVERY|BẢN ĐỒ · KHÁM PHÁ
CRAFT · PAGE |CHẾ TẠO · TRANG\u0020
BUILD BASE|XÂY CĂN CỨ
NO ACTIVE EQUIPMENT|CHƯA CÓ TRANG BỊ
PICK UP|NHẶT
Health: |Sức khỏe:\u0020
State: |Trạng thái:\u0020
Yield: |Sản lượng:\u0020
Progress: |Tiến độ:\u0020
Biome: |Quần xã:\u0020
Built · orientation |Đã xây · hướng\u0020
Stored weight: |Khối lượng lưu trữ:\u0020
Stored volume: |Thể tích lưu trữ:\u0020
 Clean Water| Nước sạch
 E · Gather| E · Thu thập
 PU capacity| PU công suất
 PU demand · | PU nhu cầu ·\u0020
 TEAM| NHÓM
 Thermal contribution to stamina recovery penalty: | Mức giảm hồi thể lực do thân nhiệt:\u0020
 WASD · Move| WASD · Di chuyển
 active Death Cache| kho đồ sau khi chết đang tồn tại
 active Death Caches| kho đồ sau khi chết đang tồn tại
 bulk units, not slots.| đơn vị thể tích, không phải số ô.
 cells · UNKNOWN remains opaque| ô · phần CHƯA BIẾT được che kín
 conditions| trạng thái
 footprints · arc | điểm đặt chân · góc\u0020
 items · | vật phẩm ·\u0020
 min| phút
 percentage points to the stamina recovery penalty. Bulk and weight are separate limits.| điểm phần trăm giảm tốc độ hồi thể lực. Thể tích và khối lượng có giới hạn riêng.
 recipes| công thức
 recovery caches| kho đồ cần thu hồi
 visited regions · use a laboratory. You can change profession here.| vùng đã đến · dùng phòng thí nghiệm. Có thể đổi nghề tại đây.
 · Carry a usable | · Mang theo vật phẩm còn dùng được:\u0020
 · DONE| · XONG
 · Ecology | · Sinh thái\u0020
 · FULL| · ĐẦY
 · Feed | · Thức ăn\u0020
 · Fish | · Cá\u0020
 · OBSERVED: | · ĐÃ QUAN SÁT:\u0020
 · OUTPOST| · TIỀN ĐỒN
 · PLACE IN WORLD · | · ĐẶT VÀO THẾ GIỚI ·\u0020
 · PLAYER → STORAGE| · TÚI ĐỒ → KHO
 · R choose lab side · Escape cancel| · R chọn phía phòng thí nghiệm · Escape để hủy
 · STORAGE → PLAYER| · KHO → TÚI ĐỒ
 · SURVEYED| · ĐÃ KHẢO SÁT
 · [1-6] CRAFT · [ / ] PAGE| · [1-6] CHẾ TẠO · [ / ] ĐỔI TRANG
 · active minute | · phút hoạt động\u0020
 · choose a different position| · chọn vị trí khác
 · choose another position| · chọn vị trí khác
 · next fish ≈ | · cá tiếp theo ≈\u0020
 · region | · vùng\u0020
% · Water |% · Nước\u0020
% · Water: |% · Nước:\u0020
% · water retention |% · giữ nước\u0020
/4 · reduces current crop time by 25%|/4 · giảm 25% thời gian sinh trưởng cây hiện tại
A broader local survey radius in explored expeditions.|Bán kính khảo sát rộng hơn tại vùng thám hiểm đã khám phá.
A discovery item. Its identity does not reveal an unexplored location.|Vật phẩm khám phá. Danh tính không tiết lộ vị trí chưa khám phá.
A food item or cooking ingredient. Only items with a restoration profile can be consumed directly.|Thức ăn hoặc nguyên liệu nấu. Chỉ vật phẩm có chỉ số phục hồi mới dùng trực tiếp được.
A gathered material used in crafting or construction.|Vật liệu thu thập dùng để chế tạo hoặc xây dựng.
A hostile is nearby. Reach a safe place before resting.|Có kẻ địch gần đây. Đến nơi an toàn trước khi nghỉ.
A hunting ingredient. Cook or preserve it at the relevant station.|Nguyên liệu săn được. Nấu hoặc bảo quản tại trạm phù hợp.
A hunting ingredient. Process it into leather at a Tannery.|Nguyên liệu săn được. Xử lý thành da thuộc tại xưởng thuộc da.
A living wild-plant root for relocation and regrowth.|Rễ cây hoang còn sống để di dời và trồng lại.
A medical supply for recovering health.|Vật phẩm y tế phục hồi sức khỏe.
A portable construction kit for the core Build menu. Field blueprints can be placed before supplying materials.|Bộ lắp ráp mang theo dùng trong menu Xây dựng. Có thể đặt bản dựng dã ngoại trước rồi góp vật liệu.
A processed ingredient used in crafting or construction.|Nguyên liệu đã xử lý dùng để chế tạo hoặc xây dựng.
A tool for world interactions. Keep it in your inventory.|Công cụ tương tác với thế giới. Giữ trong túi đồ.
A water supply used for survival or cultivation.|Nguồn nước dùng cho sinh tồn hoặc trồng trọt.
Actions that need stamina cannot start. Keeping Shift held resumes sprint only after its recovery threshold.|Không thể bắt đầu thao tác cần thể lực. Giữ Shift chỉ chạy nhanh lại sau khi thể lực hồi đủ ngưỡng.
Active effects · |Hiệu ứng đang có ·\u0020
Add timber · 5 min|Thêm gỗ · 5 phút
After a mature wild-plant harvest, uproot using a Field Hoe. Replant this root on suitable explored ground.|Sau khi thu hoạch cây hoang trưởng thành, đào rễ bằng Cuốc dã ngoại. Trồng lại trên đất phù hợp đã khám phá.
After restoration: |Sau phục hồi:\u0020
Atmospheric Water Condenser · [E] INTERACT|Máy ngưng tụ nước khí quyển · [E] TƯƠNG TÁC
Attached habitat · R selects connector · click to confirm|Phòng ở gắn mô-đun · R chọn đầu nối · nhấp để xác nhận
Attached habitat: use R to choose a landing connector.|Phòng ở gắn mô-đun: dùng R để chọn đầu nối tại điểm hạ cánh.
Attached module: R selects another lab connector. Field cabins can be built independently.|Mô-đun gắn liền: R chọn đầu nối khác của phòng thí nghiệm. Nhà dã ngoại có thể xây độc lập.
B · BUILD · TAB STRUCTURE · R ROTATE · ENTER PLACE|B · XÂY · TAB CHỌN CÔNG TRÌNH · R XOAY · ENTER ĐẶT
BED · |GIƯỜNG ·\u0020
BITE! Reel within |CÁ CẮN! Kéo trong\u0020
BUILD NEAR THE BED SITE WEST OF LANDING|XÂY GẦN VỊ TRÍ GIƯỜNG PHÍA TÂY ĐIỂM HẠ CÁNH
BUILD NEAR THE PEN SITE EAST OF LANDING|XÂY GẦN VỊ TRÍ CHUỒNG PHÍA ĐÔNG ĐIỂM HẠ CÁNH
BUILD · CLICK FACILITY · PREPARE KIT · POINT & CLICK WORLD|XÂY · CHỌN CÔNG TRÌNH · CHUẨN BỊ BỘ LẮP · NHẤP VÀO THẾ GIỚI
BUILDING · INTERACT|CÔNG TRÌNH · TƯƠNG TÁC
Bring Water Online|Vận hành nguồn nước
Build a pen within 6 m of this animal.|Xây chuồng trong phạm vi 6 m của động vật này.
Build cultivation bed · 3 Timber + 1 Cordage|Xây luống trồng · 3 Gỗ + 1 Dây thừng
Build grazer pen · 4 Timber + 2 Cordage|Xây chuồng thú ăn cỏ · 4 Gỗ + 2 Dây thừng
Build storage crate|Xây thùng lưu trữ
Burning: |Đang cháy:\u0020
C · CRAFT · CLICK CRAFT / 1–6 · [ / ] OR PGUP / PGDN PAGE|C · CHẾ TẠO · NHẤP CHẾ TẠO / 1–6 · [ / ] HOẶC PGUP / PGDN ĐỔI TRANG
CAP REACHED|ĐÃ ĐẠT GIỚI HẠN
CARED FOR · |ĐÃ CHĂM SÓC ·\u0020
CARRY · |MANG THEO ·\u0020
COLONY · CULTIVATION / HUSBANDRY · N TO CLOSE|THUỘC ĐỊA · TRỒNG TRỌT / CHĂN NUÔI · N ĐỂ ĐÓNG
COND |ĐỘ BỀN\u0020
Carry a usable Stone Field Tool.|Mang theo Công cụ đá dã ngoại còn dùng được.
Carrying contributes |Mang đồ làm tăng\u0020
Caught |Đã câu được\u0020
Character status · |Trạng thái nhân vật ·\u0020
Chart the Unknown|Lập bản đồ vùng chưa biết
Click explored dry ground within 4 m · Escape cancel|Nhấp đất khô đã khám phá trong phạm vi 4 m · Escape để hủy
Click explored water within 4 m · 1 bait per cast · Escape / right-click cancel|Nhấp nước đã khám phá trong phạm vi 4 m · 1 mồi mỗi lần thả · Escape / nhấp phải để hủy
Click nearby explored ground · R rotate · Escape cancel|Nhấp đất đã khám phá gần đây · R xoay · Escape để hủy
Cold Exposure|Nhiễm lạnh
Cold Rain|Mưa lạnh
Collect a bounded clean-water supply during local rain.|Hứng nước sạch có giới hạn khi có mưa tại đây.
Collect water · |Lấy nước ·\u0020
Colony|Thuộc địa
Colony depth actions|Hoạt động phát triển thuộc địa
Connector →|Đầu nối →
Convert organic material into soil fertilizer.|Chuyển vật liệu hữu cơ thành phân bón đất.
Cook edible plants and water into a nourishing meal.|Nấu thực vật ăn được và nước thành bữa ăn bổ dưỡng.
Cook meal · 1 plant + 1 water|Nấu bữa ăn · 1 thực vật + 1 nước
Craft |Chế tạo\u0020
Craft station recipes away from the landing site.|Chế tạo công thức của trạm ở xa điểm hạ cánh.
Critical dehydration|Thiếu nước nghiêm trọng
Critical starvation|Đói nghiêm trọng
Crops mature faster under active care.|Cây trưởng thành nhanh hơn khi được chăm sóc.
Cultivation|Canh tác
Cultivation bed|Luống trồng
Cultivator|Người trồng trọt
Current character appearance|Ngoại hình nhân vật hiện tại
Current stamina recovery penalty: |Mức giảm hồi thể lực hiện tại:\u0020
Current thermal damage: none.|Sát thương thân nhiệt hiện tại: không có.
DETAIL · |CHI TIẾT ·\u0020
E · PICK UP / GATHER / RECOVER / MACHINE / WORKBENCH|E · NHẶT / THU THẬP / THU HỒI / MÁY / BÀN CHẾ TẠO
EMPTY · FIND A PASSIVE GRAZER AND PRESS E TO CAPTURE (1 CORDAGE)|TRỐNG · TÌM THÚ ĂN CỎ HIỀN VÀ BẤM E ĐỂ BẮT (1 DÂY THỪNG)
EMPTY · PLANT AN EDIBLE CUTTING + WATER|TRỐNG · TRỒNG CÂY THỰC PHẨM + NƯỚC
ESC · CLOSE ACTIVE PANEL|ESC · ĐÓNG BẢNG ĐANG MỞ
EXIT FULLSCREEN|THOÁT TOÀN MÀN HÌNH
EXPLORED · |ĐÃ KHÁM PHÁ ·\u0020
Early growth · ≈ |Mới mọc · ≈\u0020
Emergency supplies · once|Tiếp tế khẩn cấp · một lần
Emergency supplies · safe rest · base services|Tiếp tế khẩn cấp · nghỉ an toàn · dịch vụ căn cứ
Engineer|Kỹ sư
Engineer — Prototype|Kỹ sư — Nguyên mẫu
Equip selected |Trang bị vật phẩm đã chọn\u0020
Equip this weapon to attack using its defined range and stamina cost.|Trang bị vũ khí để tấn công theo phạm vi và chi phí thể lực đã quy định.
Expanded Storage|Kho mở rộng
Expedition blueprints · materials later|Bản dựng thám hiểm · góp vật liệu sau
Expedition construction|Xây dựng thám hiểm
Explore |Khám phá\u0020
Explorer|Nhà thám hiểm
Explorer — Prototype|Nhà thám hiểm — Nguyên mẫu
Exposure causes 1 health damage every |Phơi nhiễm gây mất 1 sức khỏe mỗi\u0020
FERTILIZER · |PHÂN BÓN ·\u0020
FIRST STEP · [E] GATHER · |BƯỚC ĐẦU · [E] THU THẬP ·\u0020
FULLSCREEN UNAVAILABLE · USE F11|CHƯA DÙNG ĐƯỢC TOÀN MÀN HÌNH · DÙNG F11
Farm & survival crafting · |Chế tạo nông trại và sinh tồn ·\u0020
Farm plot|Ô trồng
Farm plot · |Ô trồng ·\u0020
Feed a captured animal in its pen or coop to support growth, breeding and products.|Cho vật nuôi trong chuồng ăn để hỗ trợ lớn lên, sinh sản và sản phẩm.
Feed: |Thức ăn:\u0020
Fertilize a cultivated plot to improve its fertility.|Bón phân cho ô trồng để tăng độ phì.
Field Cordage|Dây thừng dã ngoại
Field Survey|Khảo sát dã ngoại
Field Workbench within 2 m|Bàn chế tạo dã ngoại trong phạm vi 2 m
Fieldcraft Basics|Kỹ năng dã ngoại cơ bản
Finite supplies: |Tiếp tế hữu hạn:\u0020
Fire bricks and make charcoal from timber.|Nung gạch và làm than từ gỗ.
Fire burning: stay within 4 m for warmth.|Lửa đang cháy: đứng trong phạm vi 4 m để giữ ấm.
Food shortage reduces stamina recovery.|Thiếu thức ăn làm giảm hồi thể lực.
Food shortage reduces stamina recovery. At zero food, health loses 1 point every 10 active seconds after the damage timer starts.|Thiếu thức ăn làm giảm hồi thể lực. Khi thức ăn bằng 0, mất 1 sức khỏe mỗi 10 giây hoạt động sau khi bộ đếm sát thương bắt đầu.
GRAZER · FEED + WATER FOR FERTILIZER|THÚ ĂN CỎ · CHO ĂN + NƯỚC ĐỂ LẤY PHÂN BÓN
GROWING · |ĐANG LỚN ·\u0020
Game actions|Thao tác trò chơi
Grazer pen|Chuồng thú ăn cỏ
Grazer · 1 Cordage|Thú ăn cỏ · 1 Dây thừng
Growth paused: water needed|Sinh trưởng tạm dừng: cần nước
Growth runs only while this world is active. Build and care within reach of the site.|Cây chỉ sinh trưởng khi thế giới đang hoạt động. Xây và chăm sóc trong phạm vi địa điểm.
H · CONTROLS|H · ĐIỀU KHIỂN
HABITAT · CONNECTOR ARROWS · CLICK PLACE|PHÒNG Ở · MŨI TÊN ĐẦU NỐI · NHẤP ĐỂ ĐẶT
Habitat Room|Phòng ở
Harmful thermal change ×|Biến đổi thân nhiệt có hại ×
Harvest · 3 Edible Plant|Thu hoạch · 3 Thực vật ăn được
Health |Sức khỏe\u0020
Health is reduced. Damage can be lethal at zero health.|Sức khỏe đã giảm. Sát thương có thể gây chết khi sức khỏe bằng 0.
Higher effective colony storage capacity.|Tăng dung lượng lưu trữ thực tế của thuộc địa.
Homestead farming and wildlife|Nông trại và động vật hoang dã
Hydration Pack|Túi nước
I · INVENTORY · M · MAP · P · PROGRESSION|I · TÚI ĐỒ · M · BẢN ĐỒ · P · TIẾN TRÌNH
INVENTORY · CLICK ITEM / ↑↓ SELECT · X EQUIP · G DROP|TÚI ĐỒ · NHẤP VẬT PHẨM / ↑↓ CHỌN · X TRANG BỊ · G THẢ
INVESTIGATED RUIN|DI TÍCH ĐÃ KHẢO SÁT
Independent shelter and safe rest anywhere on suitable explored ground.|Nơi trú và nghỉ an toàn độc lập trên đất phù hợp đã khám phá.
Investigated Ruin · INVESTIGATED|Di tích đã khảo sát · ĐÃ KHẢO SÁT
Irrigation reservoir filled.|Đã nạp bồn tưới.
KIT UNAVAILABLE|CHƯA CÓ BỘ LẮP RÁP
Keep this rod and plant bait in your bag. Homestead → Fish nearby water, then click explored water within 4 m. Wait for the bite and reel with Space. Moving or taking damage interrupts fishing.|Giữ cần và mồi thực vật trong túi. Nông trại → Câu ở vùng nước gần đây, rồi nhấp nước đã khám phá trong phạm vi 4 m. Chờ cá cắn và kéo bằng Space. Di chuyển hoặc bị thương sẽ ngắt câu.
Keeps shared materials. Returns surplus to your bag or an accessible nearby crate. If neither has enough room, the original blueprint stays intact. Missing materials can be added later.|Giữ vật liệu chung. Trả phần dư vào túi hoặc thùng gần đó có thể tiếp cận. Nếu không đủ chỗ, bản dựng cũ được giữ nguyên. Có thể góp phần thiếu sau.
L · SAVE WORLD|L · LƯU THẾ GIỚI
LANDING MODULE · BASE|Mô-đun hạ cánh · Căn cứ
MOVE TO SET FACING|DI CHUYỂN ĐỂ ĐỔI HƯỚNG
MOVE · WASD / ARROWS|DI CHUYỂN · WASD / PHÍM MŨI TÊN
Maintenance Basics|Bảo trì cơ bản
Marsh Perch|Cá rô đầm
Matching items|Vật phẩm cùng loại
Maximum growth reached · best yield |Đã trưởng thành · sản lượng tốt nhất\u0020
Mill harvested grain into flour for bread.|Xay ngũ cốc thu hoạch thành bột làm bánh.
Move building · choose nearby ground · R rotate · Escape cancel|Di chuyển công trình · chọn đất gần đây · R xoay · Escape để hủy
Move within interaction range and meet the displayed requirements.|Đến trong phạm vi tương tác và đáp ứng yêu cầu được hiển thị.
N · COLONY · GROW FOOD / CARE FOR GRAZER · E CAPTURE|N · THUỘC ĐỊA · TRỒNG THỨC ĂN / CHĂM THÚ ĂN CỎ · E BẮT
NEED |CẦN\u0020
NEED item:fishing-bait|CẦN MỒI CÂU THỰC VẬT
NO CONNECTOR|KHÔNG CÓ ĐẦU NỐI
NO HOSTILE TARGET|KHÔNG CÓ MỤC TIÊU THÙ ĐỊCH
NO LANDING CONNECTOR|KHÔNG CÓ ĐẦU NỐI HẠ CÁNH
NO TARGET IN RANGE|KHÔNG CÓ MỤC TIÊU TRONG TẦM
Need |Cần\u0020
Needs: |Cần:\u0020
OUTPUT FULL|ĐẦU RA ĐẦY
One bait is used by a successful cast. Cancelling or missing the bite does not return it. Nearby water cells share a finite population that recovers during active world time.|Mỗi lần thả thành công dùng một mồi. Hủy hoặc bỏ lỡ cá cắn không hoàn mồi. Ô nước gần nhau dùng chung quần thể hữu hạn, hồi phục theo thời gian thế giới hoạt động.
Open inventory [I] nearby to store stacks|Mở túi đồ [I] ở gần để cất chồng vật phẩm
Orientation |Hướng\u0020
PEN · |CHUỒNG ·\u0020
PLAYER · |NHÂN VẬT ·\u0020
PRODUCT REVIEW CONTROLS · H TO CLOSE|ĐIỀU KHIỂN · H ĐỂ ĐÓNG
Phase 1 Early Progression|Tiến trình đầu Giai đoạn 1
Plan expedition storage|Đặt bản dựng kho thám hiểm
Plant + water · 1 Edible Plant + 1 Clean Water|Trồng và tưới · 1 Thực vật ăn được + 1 Nước sạch
Plant on a cultivated plot to grow |Trồng trên ô đã cuốc để mọc\u0020
Player body height|Chiều cao thân nhân vật
Player body width|Chiều rộng thân nhân vật
Player frame height|Chiều cao khung nhân vật
Player frame width|Chiều rộng khung nhân vật
Pond Minnow|Cá tuế ao
Prepare Root Seeds|Chuẩn bị hạt cây củ
Preserve hunted meat with salt and charcoal.|Bảo quản thịt săn bằng muối và than.
Previous-Civilization Ruin|Di tích nền văn minh trước
Process raw hides into leather for clothing and tools.|Xử lý da sống thành da thuộc để làm quần áo và công cụ.
Produce clean water using nearby colony power. One per world.|Sản xuất nước sạch bằng điện thuộc địa gần đó. Mỗi thế giới một máy.
Product Review controls|Điều khiển trò chơi
Protect nearby crops from frost and reduce evaporation.|Bảo vệ cây gần đó khỏi sương giá và giảm bay hơi.
Q · EQUIP / UNEQUIP BASIC SPEAR|Q · TRANG BỊ / THÁO GIÁO CƠ BẢN
READY TO HARVEST|SẴN SÀNG THU HOẠCH
RIGHT CLICK · CANCEL PLACEMENT|NHẤP PHẢI · HỦY ĐẶT
Reach shelter or a safer climate. A usable Thermal Wrap slows harmful exposure. In solo, a fuelled campfire within 4 m or entering a Field Cabin helps restore a safe thermal target.|Đến nơi trú hoặc khí hậu an toàn hơn. Áo giữ nhiệt còn dùng được làm chậm phơi nhiễm có hại. Trong chơi đơn, lửa trại có nhiên liệu trong phạm vi 4 m hoặc vào Nhà dã ngoại giúp đưa thân nhiệt về mức an toàn.
Recover +15 health / +40 stamina for 5 food + 5 water. Moving, damage or danger cancels rest.|Hồi 15 sức khỏe / 40 thể lực với 5 thức ăn + 5 nước. Di chuyển, bị thương hoặc nguy hiểm sẽ hủy nghỉ.
Recover supplies|Thu hồi tiếp tế
Recovered coordinate: |Tọa độ đã phục hồi:\u0020
Renewing: |Đang tái sinh:\u0020
Replacement for |Thay thế cho\u0020
Replant |Trồng lại\u0020
Replant on explored ground within 4 m · Escape / right-click cancel|Trồng lại trên đất đã khám phá trong phạm vi 4 m · Escape / nhấp phải để hủy
Requires |Yêu cầu\u0020
Research [U]|Nghiên cứu [U]
Research within 4 m|Nghiên cứu trong phạm vi 4 m
Research without returning to the original base.|Nghiên cứu mà không cần về căn cứ ban đầu.
Reservoir |Bồn chứa\u0020
Resource|Tài nguyên
Resource depleted|Tài nguyên đã cạn
Rest available when safe and fed.|Có thể nghỉ khi an toàn và đủ thức ăn.
Rest complete · recovery cooldown active.|Đã nghỉ xong · đang chờ hồi lại lượt nghỉ.
Rest started · moving or danger cancels it.|Đã bắt đầu nghỉ · di chuyển hoặc nguy hiểm sẽ hủy.
Resting · |Đang nghỉ ·\u0020
Restore this site first.|Phục hồi địa điểm này trước.
Restores |Phục hồi\u0020
River Trout|Cá hồi sông
Root Vegetables|Rau củ
Rotate [R]|Xoay [R]
Ruin · UNKNOWN|Di tích · CHƯA BIẾT
SHIFT · SPRINT · 8 STAMINA/SEC · FOOD DRAINS 25% FASTER|SHIFT · CHẠY NHANH · 8 THỂ LỰC/GIÂY · THỨC ĂN GIẢM NHANH HƠN 25%
SOURCE MISSING|NGUỒN KHÔNG CÒN
SPACE · ATTACK|SPACE · TẤN CÔNG
STORAGE · |KHO ·\u0020
Safe, interruptible short sleep and recovery.|Nghỉ ngắn an toàn và phục hồi, có thể bị ngắt.
Salt Deposit|Vỉa muối
Save failed — progress since your last successful save is not durable. Retry Save.|Lưu thất bại — tiến độ sau lần lưu thành công gần nhất chưa được giữ bền vững. Hãy lưu lại.
Seeds planted.|Đã trồng hạt.
Select |Chọn\u0020
Select Clean Water in Inventory and use it. Collect more from an operating condenser or a rain collector in solo.|Chọn Nước sạch trong Túi đồ và dùng. Lấy thêm từ máy ngưng tụ đang chạy hoặc bộ hứng mưa trong chơi đơn.
Select gear and equip it, or drag it into a slot. Equipped gear stays in your bag.|Chọn và trang bị, hoặc kéo vào ô phù hợp. Đồ đang trang bị vẫn nằm trong túi.
Select the displayed seed to copy it.|Chọn seed đang hiển thị để sao chép.
Selected item|Vật phẩm đã chọn
Selected item details|Chi tiết vật phẩm đã chọn
Selected stack: |Chồng đã chọn:\u0020
Shear wool|Xén lông
Shelter chickens and collect eggs after feeding.|Nuôi gà và lấy trứng sau khi cho ăn.
Size: |Kích thước:\u0020
Sleep / rest|Ngủ / nghỉ
Sleep / rest · 8s|Ngủ / nghỉ · 8 giây
Slot: |Ô trang bị:\u0020
Soil watered.|Đã tưới đất.
Soil: |Đất:\u0020
Sound volume|Âm lượng
Sources: |Nguồn:\u0020
Specialize|Chọn chuyên môn
Spring +35% growth · Summer: water regularly · Autumn +25% harvest · Winter: fire and shelter. Each season lasts 12 active minutes.|Xuân +35% sinh trưởng · Hè: tưới đều · Thu +25% thu hoạch · Đông: lửa và nơi trú. Mỗi mùa dài 12 phút hoạt động.
Stack limit: |Giới hạn mỗi chồng:\u0020
Stamina recovery is stopped. At zero water, health loses 1 point every 5 active seconds after the damage timer starts.|Thể lực ngừng hồi. Khi nước bằng 0, mất 1 sức khỏe mỗi 5 giây hoạt động sau khi bộ đếm sát thương bắt đầu.
Stand on dry bank ground before casting.|Đứng trên bờ đất khô trước khi thả câu.
Starving|Đói lả
Still growing or producing.|Vẫn đang lớn hoặc sản xuất.
Storage Crate Kit|Bộ lắp thùng lưu trữ
Store real inventory stacks near an expedition.|Cất chồng vật phẩm thực gần nơi thám hiểm.
Store supplies in a nearby crate/cache, or drop a selected quantity. Empty grid space does not remove item bulk.|Cất đồ vào thùng/kho gần đó hoặc thả số lượng đã chọn. Ô trống không làm giảm thể tích vật phẩm.
Store supplies near a crate: open Inventory [I] beside it. Build a crate with 4 Timber + 2 Cordage.|Đứng cạnh thùng và mở Túi đồ [I] để cất đồ. Xây thùng bằng 4 Gỗ + 2 Dây thừng.
Sun Visor|Mũ che nắng
Supplies collected or facility action completed.|Đã lấy tiếp tế hoặc hoàn thành thao tác công trình.
Supplies recovered · this site does not refill.|Đã thu hồi tiếp tế · địa điểm không tự nạp lại.
Supply Cache|Kho tiếp tế
Supply Cache blueprint: 2 Timber + 2 Plant Fiber. Open Inventory [I] nearby to store supplies. Volume measures item bulk, not empty slots.|Bản dựng Kho tiếp tế: 2 Gỗ + 2 Sợi thực vật. Mở Túi đồ [I] ở gần để cất đồ. Thể tích đo kích thước vật phẩm, không phải số ô trống.
Supply the existing colony power network. One unit per world.|Cấp điện cho mạng thuộc địa hiện có. Mỗi thế giới một bộ.
T · EQUIP / UNEQUIP THERMAL WRAP|T · TRANG BỊ / THÁO ÁO GIỮ NHIỆT
TAB · MARKER DETAIL|TAB · CHI TIẾT DẤU BẢN ĐỒ
TEAM A|NHÓM A
TEAM B|NHÓM B
TEAM C|NHÓM C
TEAM POSITIONS · authoritative current state|VỊ TRÍ NHÓM · TRẠNG THÁI HIỆN TẠI DO AUTHORITY XÁC NHẬN
Tame · 1 feed|Thuần hóa · 1 thức ăn vật nuôi
Tempered Spear|Giáo tôi luyện
Territorial Predator · |Thú săn mồi giữ lãnh thổ ·\u0020
The fish escaped. Reel within four seconds of the bite.|Cá đã thoát. Kéo trong vòng bốn giây sau khi cá cắn.
The landing lab is a fixed world landmark.|Phòng thí nghiệm hạ cánh là mốc cố định trong thế giới.
The line is blocked. Try a clear bank.|Đường câu bị chặn. Thử bờ trống.
The world changed. Please try again.|Thế giới đã thay đổi. Hãy thử lại.
The world changed. Try this action again.|Thế giới đã thay đổi. Thử lại thao tác này.
These finite supplies have already been recovered.|Tiếp tế hữu hạn này đã được thu hồi.
Thirsty|Khát
This patch is regenerating.|Vùng này đang tái sinh.
This site has already been restored.|Địa điểm này đã được phục hồi.
This world has reached the expedition facility limit.|Thế giới đã đạt giới hạn công trình thám hiểm.
Till a new plot|Cuốc ô trồng mới
Till nearby suitable ground, uproot a mature harvested wild plant, or replant a carried root.|Cuốc đất phù hợp gần đây, đào rễ cây hoang trưởng thành đã thu hoạch hoặc trồng lại rễ đang mang.
Timber Tree|Cây lấy gỗ
Too heavy to land the fish. Free bag space before the bite window closes.|Túi quá nặng để cất cá. Dọn túi trước khi hết thời gian kéo câu.
Too many unfinished blueprints. Complete or cancel one first.|Quá nhiều bản dựng chưa hoàn thành. Hoàn thành hoặc hủy một bản trước.
Trail Boots|Ủng đi đường
Treatment: |Cách xử lý:\u0020
UNINVESTIGATED RUIN|DI TÍCH CHƯA KHẢO SÁT
UNRESOLVED: |CHƯA GIẢI QUYẾT:\u0020
Unequip |Tháo\u0020
Uninvestigated Ruin · LOCATED|Di tích chưa khảo sát · ĐÃ ĐỊNH VỊ
Use Craft [C] nearby for station recipes|Dùng Chế tạo [C] ở gần để chế tạo công thức của trạm
Use a Field Dressing. In solo, safe rest at the lab or a completed bed/cabin can also recover health.|Dùng Băng cứu thương dã ngoại. Trong chơi đơn, nghỉ an toàn tại phòng thí nghiệm hoặc giường/nhà đã hoàn thành cũng hồi sức khỏe.
Use a nearby Field Workbench for this recipe.|Dùng Bàn chế tạo dã ngoại gần đó cho công thức này.
Use an edible item with a Food restoration value. Cooking a meal at a completed campfire is another solo option.|Dùng vật phẩm ăn được có chỉ số phục hồi thức ăn. Nấu bữa ăn tại lửa trại đã hoàn thành là lựa chọn khác trong chơi đơn.
Use selected item [V]|Dùng vật phẩm đã chọn [V]
Use the landing lab or a restored field laboratory.|Dùng phòng thí nghiệm hạ cánh hoặc phòng thí nghiệm dã ngoại đã phục hồi.
V · CONSUME / CANCEL CONSUME|V · DÙNG / HỦY DÙNG
Valid ground|Đất hợp lệ
Viewport too small · ProZ0 requires at least 640×360 logical pixels.|Cửa sổ quá nhỏ · ProZ0 cần ít nhất 640×360 pixel logic.
Visible marker for a discovered outpost.|Dấu nhìn thấy được cho tiền đồn đã khám phá.
Visited: |Đã đến:\u0020
WEATHER APPROACHING|THỜI TIẾT SẮP ĐẾN
WEATHER · FORECAST|THỜI TIẾT · DỰ BÁO
WORKBENCH REQUIRED|CẦN BÀN CHẾ TẠO
WORKBENCH · READY|BÀN CHẾ TẠO · SẴN SÀNG
WORKBENCH · REQUIRED|BÀN CHẾ TẠO · CẦN THIẾT
Wait for the bite before reeling.|Chờ cá cắn trước khi kéo.
Waiting for a bite · stay still|Đang chờ cá cắn · đứng yên
Wake up|Thức dậy
Walk closer (4 m).|Đến gần hơn (4 m).
Water Stewardship|Quản lý nước
Water a planted crop or wild plant using one carried Clean Water.|Tưới cây trồng hoặc cây hoang bằng một Nước sạch đang mang.
Water needed · growth paused|Cần nước · sinh trưởng tạm dừng
Water roots · 1 clean water|Tưới rễ · 1 nước sạch
Water shortage reduces stamina recovery.|Thiếu nước làm giảm hồi thể lực.
Water · 1 clean water|Tưới · 1 nước sạch
Wear this equipment for its defined protection.|Mặc trang bị để có mức bảo vệ đã quy định.
Weight: |Khối lượng:\u0020
Wild|Hoang dã
Wild Flax|Lanh hoang
Wild Grain|Ngũ cốc hoang
Wild Herbs|Thảo dược hoang
Withered|Héo
Withered: clear and replant.|Đã héo: dọn và trồng lại.
Workbench Kit|Bộ lắp bàn chế tạo
World autosaved|Đã tự lưu thế giới
World object|Vật thể thế giới
World saved — bookmark this page before leaving.|Đã lưu thế giới — đánh dấu trang này trước khi rời.
World seed copied.|Đã sao chép seed thế giới.
World seed: |Seed thế giới:\u0020
You|Bạn
You are already well fed.|Bạn đã đủ thức ăn.
You cannot do this while incapacitated.|Không thể làm việc này khi mất khả năng hành động.
You have already collected this world’s emergency supplies.|Bạn đã lấy tiếp tế khẩn cấp của thế giới này.
You have rested recently. Wait before resting again.|Bạn vừa nghỉ gần đây. Chờ trước khi nghỉ tiếp.
You need at least 15 food and 15 water to rest safely.|Cần ít nhất 15 thức ăn và 15 nước để nghỉ an toàn.
Your bag changed. Please try again.|Túi đồ đã thay đổi. Hãy thử lại.
Your bag has no remaining materials needed by this blueprint.|Túi không còn vật liệu mà bản dựng này cần.
Your bag has no room. Store or drop some items first.|Túi hết chỗ. Cất hoặc thả bớt đồ trước.
Your bag is full. Store or drop some items first.|Túi đã đầy. Cất hoặc thả bớt đồ trước.
Your bag is too heavy. Store or drop some items first.|Túi quá nặng. Cất hoặc thả bớt đồ trước.
Your equipped weapon is broken. Repair or replace it.|Vũ khí đang trang bị đã hỏng. Sửa hoặc thay thế.
Your inventory changed. Try this action again.|Túi đồ đã thay đổi. Thử lại thao tác này.
[V] CONSUME · |[V] DÙNG ·\u0020
enter within 1.25 m|vào trong phạm vi 1,25 m
return to the surface|trở về mặt đất
s active time| giây hoạt động
s of world time| giây của thế giới
s remaining| giây còn lại
° · click ground|° · nhấp đất
← Connector|← Đầu nối
⌁ Professions|⌁ Nghề nghiệp
◇ Journal [J]|◇ Nhật ký [J]
☘ Homestead [F]|☘ Nông trại [F]
⚗ Research [U]|⚗ Nghiên cứu [U]
✓ Completed|✓ Hoàn thành
✓ Selected|✓ Đã chọn
Save and return to lobby|Lưu và về sảnh
Arriving on ProZ0|Đặt chân đến ProZ0
Continue|Tiếp tục
Skip|Bỏ qua
INCOMING SIGNAL|TÍN HIỆU ĐẾN
The survey ship enters orbit around an unmapped world. Below: floating islands in the fog.|Tàu khảo sát tiến vào quỹ đạo một thế giới chưa có trên bản đồ. Bên dưới: những mảnh đất lơ lửng trong màn sương.
LANDING|HẠ CÁNH
The pioneer capsule touches down. Reserves cover only your first steps; the rest of the journey is yours.|Khoang tiên phong chạm đất. Nguồn dự trữ chỉ đủ cho bước đầu; hành trình còn lại nằm trong tay bạn.
A NEW BASE|MỘT CĂN CỨ MỚI
Find water, gather materials and build shelter. Explore the traces left behind — alone or with friends.|Tìm nước, thu thập vật liệu và dựng nơi trú. Khám phá những dấu vết còn lại — một mình, hoặc cùng bạn bè.
Begin journey|Bắt đầu hành trình
Small|Nhỏ
Medium|Vừa
Large|Lớn
Disabled|Đã tắt
Unpowered|Không có điện
Running|Đang chạy
Clear|Quang đãng
Noon|Giữa trưa
Dawn|Bình minh
Dusk|Hoàng hôn
Night|Ban đêm
Wet|Ẩm
Dry|Khô
Normal moisture|Độ ẩm bình thường
ENTER|VÀO
EXIT|THOÁT
GATHER|THU THẬP
RECOVER|THU HỒI
CONSUME|DÙNG
TRAVEL|DI CHUYỂN
RENEWING|TÁI SINH
AVAILABLE|SẴN SÀNG
BLOCKED|BỊ CHẶN
CHANNELING|ĐANG THỰC HIỆN
CURRENT|HIỆN TẠI
HEALTHY|KHỎE MẠNH
HYDRATED|ĐỦ NƯỚC
FED|ĐỦ THỨC ĂN
COMFORTABLE|DỄ CHỊU
Brick|Gạch nung`;
export function uiMessageKey(source: string): string {
  let hash = 2166136261; for (const c of source) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
  return 'ui.' + hash.toString(16);
}
const authored = glossary.split('\n').map(row => {
  const pair = row.split('|');
  if (pair.length !== 2 || !pair[0] || !pair[1]) throw Error('Invalid UI glossary row: ' + row);
  return pair as [string, string];
});
const rowMap = new Map(authored.map(([en,vi])=>[en,vi]));
for (const [en,vi] of authored) if (!rowMap.has(en.toUpperCase())) rowMap.set(en.toUpperCase(),vi);
const rows = [...rowMap];
if (rows.some(row=>row.length!==2) || new Set(rows.map(([source])=>uiMessageKey(source))).size!==rows.length) throw Error('Invalid UI glossary');
export const uiMessages: MessageDictionary = {en:Object.fromEntries(rows.map(([en])=>[uiMessageKey(en),en])),vi:Object.fromEntries(rows.map(([en,vi])=>[uiMessageKey(en),vi]))};
export const uiText = (key: string) => message(uiMessages,key);
const sourceKeys = new Map(rows.flatMap(([en,vi])=>[[en,uiMessageKey(en)],[vi,uiMessageKey(en)]]));
export const canonicalUiPhrase = (source:string) => uiMessages.en[sourceKeys.get(source) ?? uiMessageKey(source)] ?? source;
export const uiPhrase = (value: string|null|undefined) => { const source=value??''; return statusText(source)??message(uiMessages,sourceKeys.get(source) ?? uiMessageKey(source),{},source); };
export function bindUiText(element: Element, attribute: 'textContent'|'title'|'aria-label'|'placeholder', source: string|null|undefined): void {
  bindLocalized(element,attribute,()=>uiPhrase(source ?? ''));
}
