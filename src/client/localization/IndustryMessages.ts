import { locale, type MessageDictionary } from './Locale';
import { uiPhrase } from './UiMessages';

const rows = [
  ['Open construction','Mở mục xây dựng'],
  ['Industry · O', 'Công nghiệp · O'], ['INDUSTRY', 'CÔNG NGHIỆP'],
  ['Industry management', 'Quản lý công nghiệp'], ['Industry sections', 'Mục công nghiệp'],
  ['Construction', 'Xây dựng'], ['Facilities', 'Công trình'], ['Power & logistics', 'Điện & vận chuyển'],
  ['Research', 'Nghiên cứu'], ['Close', 'Đóng'], ['Facility', 'Công trình'], ['Recipe', 'Công thức'],
  ['Offset X', 'Độ lệch X'], ['Offset Y', 'Độ lệch Y'], ['Destination X', 'Đích X'], ['Destination Y', 'Đích Y'],
  ['From', 'Từ'], ['To', 'Đến'], ['Item filter', 'Lọc vật phẩm'], ['All items', 'Mọi vật phẩm'], ['all items', 'mọi vật phẩm'],
  ['Solar array', 'Dàn pin mặt trời'], ['Power relay', 'Trạm tiếp điện'], ['Logistics depot', 'Kho vận'],
  ['Fiber processor', 'Máy xử lý sợi'], ['Fabricator', 'Máy chế tạo'], ['Greenhouse', 'Nhà kính'], ['Cargo rover', 'Xe chở hàng'],
  ['expanded storage', 'Kho mở rộng'], ['cultivation', 'Canh tác'],
  ['Industrial automation', 'Tự động hóa công nghiệp'], ['Conveyor logistics', 'Vận chuyển băng chuyền'],
  ['Protected cultivation', 'Canh tác bảo vệ'], ['Cargo mobility', 'Vận tải cơ giới'], ['Intensive cultivation', 'Canh tác thâm canh'],
  ['Cordage', 'Dây thừng'], ['Repair patch', 'Miếng sửa chữa'], ['Machine kit', 'Bộ máy'], ['Power unit kit', 'Bộ nguồn điện'],
  ['Protected crops', 'Cây trồng bảo vệ'], ['Intensive crops', 'Cây trồng thâm canh'],
  ['plant fiber', 'sợi thực vật'], ['timber', 'gỗ'], ['stone', 'đá'], ['metal ore', 'quặng kim loại'],
  ['edible plant', 'cây ăn được'], ['clean water', 'nước sạch'], ['cordage', 'dây thừng'], ['repair patch', 'miếng sửa chữa'],
  ['storage crate kit', 'bộ hòm chứa'], ['workbench kit', 'bộ bàn chế tạo'], ['habitat kit', 'bộ nhà ở'],
  ['power unit kit', 'bộ nguồn điện'], ['machine kit', 'bộ máy'],
  ['Placement near your colonist', 'Vị trí gần nhân vật'], ['Open industry research', 'Mở nghiên cứu công nghiệp'],
  ['Pause', 'Tạm dừng'], ['Resume', 'Tiếp tục'], ['Dismantle · refund materials', 'Tháo dỡ · hoàn vật liệu'],
  ['Rover cargo', 'Hàng trên xe'], ['Depot stock', 'Vật liệu trong kho'], ['Item', 'Vật phẩm'], ['Quantity', 'Số lượng'], ['Actions', 'Thao tác'],
  ['Take all', 'Lấy tất cả'], ['Buffer empty.', 'Kho đệm trống.'], ['Your bag is empty.', 'Túi trống.'],
  ['Drive rover', 'Lái xe'], ['Power networks', 'Mạng điện'], ['Conveyor logistics', 'Vận chuyển băng chuyền'],
  ['Connect conveyor', 'Nối băng chuyền'], ['Disconnect', 'Ngắt kết nối'], ['Maintenance events', 'Sự kiện bảo trì'],
  ['Researched', 'Đã nghiên cứu'], ['Production cycle progress', 'Tiến độ chu kỳ sản xuất'], ['Facility buffer', 'Kho đệm công trình'],
  ['Facility paused.', 'Đã tạm dừng công trình.'], ['Facility enabled.', 'Đã bật công trình.'],
  ['Facility repaired.', 'Đã sửa công trình.'], ['Facility dismantled. Build materials returned to your bag.', 'Đã tháo dỡ và hoàn vật liệu vào túi.'],
  ['Recipe selected.', 'Đã chọn công thức.'], ['Input loaded.', 'Đã nạp nguyên liệu.'], ['Cargo loaded.', 'Đã nạp hàng.'],
  ['Item collected.', 'Đã lấy vật phẩm.'], ['Stock collected.', 'Đã lấy vật liệu.'], ['Rover arrived.', 'Xe đã đến nơi.'],
  ['Conveyor connected.', 'Đã nối băng chuyền.'], ['Conveyor disconnected.', 'Đã ngắt băng chuyền.'],
  ['Return near the Landing Lab to research industry.', 'Về gần phòng thí nghiệm hạ cánh để nghiên cứu công nghiệp.'],
  ['Build your first facility in Construction.', 'Xây công trình đầu tiên trong mục Xây dựng.'],
  ['No network yet. Build a solar array.', 'Chưa có mạng điện. Hãy xây dàn pin mặt trời.'],
  ['Requires Logistics research.', 'Cần nghiên cứu vận chuyển băng chuyền.'],
  ['Build at least two facilities with material buffers to connect a conveyor.', 'Xây ít nhất hai công trình có kho đệm để nối băng chuyền.'],
  ['No maintenance events yet. Working facilities accumulate wear during active play.', 'Chưa có sự kiện bảo trì. Công trình hoạt động hao mòn theo thời gian chơi.'],
  ['Waiting for the colony state…', 'Đang chờ trạng thái thuộc địa…'],
  ['Supplies 12 power units to an independent local network.', 'Cấp 12 đơn vị điện cho một mạng cục bộ độc lập.'],
  ['Joins nearby arrays and carries their power within six world units.', 'Nối các dàn pin gần đó và tiếp điện trong bán kính 6 đơn vị.'],
  ['Stores 64 material units for conveyor routing.', 'Chứa 64 đơn vị vật liệu để vận chuyển qua băng chuyền.'],
  ['Processes raw fiber into cordage.', 'Xử lý sợi thực vật thành dây thừng.'],
  ['Turns processed supplies into repair patches and construction kits.', 'Chế tạo miếng sửa chữa và bộ xây dựng từ nguyên liệu đã xử lý.'],
  ['Cultivates protected food using clean water and seed plants.', 'Trồng thực phẩm trong nhà kính bằng nước sạch và cây giống.'],
  ['Carries 48 material units, charges near power and drives with its operator.', 'Chở 48 đơn vị vật liệu, sạc gần nguồn điện và di chuyển cùng người lái.'],
  ['Unlock arrays, relays, material depots and processing machines.', 'Mở khóa dàn pin, trạm tiếp điện, kho và máy xử lý.'],
  ['Unlock directed filtered conveyors and construction-kit processing.', 'Mở băng chuyền có hướng, bộ lọc và chế tạo bộ xây dựng.'],
  ['Unlock powered greenhouses after colony cultivation research.', 'Mở nhà kính dùng điện sau nghiên cứu canh tác thuộc địa.'],
  ['Unlock rechargeable rovers and shared material transport.', 'Mở xe có thể sạc và vận chuyển vật liệu dùng chung.'],
  ['Unlock a faster, higher-yield greenhouse recipe.', 'Mở công thức nhà kính nhanh hơn, sản lượng cao hơn.'],
  ['Research automation, then build a solar array and processor. Load raw materials, choose a recipe and keep the machine powered. Construction uses materials in your bag.', 'Nghiên cứu tự động hóa, xây dàn pin và máy xử lý. Nạp nguyên liệu, chọn công thức và duy trì nguồn điện. Xây dựng dùng vật liệu trong túi.'],
  ['To dismantle, unload the buffer and disconnect attached conveyors. Construction materials are refunded if your bag has space.', 'Để tháo dỡ, lấy hết đồ trong kho đệm và ngắt băng chuyền. Vật liệu được hoàn khi túi còn chỗ.'],
  ['Solar arrays and relays connect nearby infrastructure automatically. Machines share finite network capacity; build relays to extend coverage and arrays for extra capacity.', 'Dàn pin và trạm tiếp điện tự nối công trình gần đó. Công suất hữu hạn; xây trạm để mở rộng vùng cấp điện và thêm dàn pin để tăng công suất.'],
  ['running', 'đang chạy'], ['waiting input', 'chờ nguyên liệu'], ['no power', 'thiếu điện'], ['output full', 'đầu ra đầy'],
  ['power source', 'nguồn điện'], ['relay', 'tiếp điện'], ['storage', 'lưu trữ'], ['charging', 'đang sạc'], ['ready', 'sẵn sàng'],
  ['disabled', 'đã tắt'], ['broken', 'hỏng'], ['repaired', 'đã sửa'], ['service due', 'cần bảo trì'],
  ['connected · idle', 'đã nối điện · chờ'], ['powered', 'có điện'], ['unpowered', 'không có điện'],
  ['network connected', 'đã nối mạng điện'], ['idle', 'chờ'], ['network capacity unavailable', 'mạng điện hết công suất'],
  ['Move closer to this facility. Management range is 2.5 units.', 'Đến gần công trình. Phạm vi quản lý là 2,5 đơn vị.'],
  ['Your bag no longer contains this quantity.', 'Túi không còn đủ số lượng này.'],
  ['Complete the required research first.', 'Hoàn thành nghiên cứu cần thiết trước.'],
  ['Complete the prerequisite research first.', 'Hoàn thành nghiên cứu tiên quyết trước.'],
  ['Complete the required colony research first.', 'Hoàn thành nghiên cứu thuộc địa cần thiết trước.'],
  ['The destination is full. Unload some items first.', 'Nơi chứa đã đầy. Lấy bớt đồ trước.'],
  ['The facility buffer is full. Unload some items first.', 'Kho đệm công trình đầy. Lấy bớt đồ trước.'],
  ['This facility no longer exists.', 'Công trình không còn tồn tại.'],
  ['Conveyor endpoints must be within 8 world units.', 'Hai đầu băng chuyền phải cách nhau tối đa 8 đơn vị.'],
  ['This route is obstructed. Choose another destination.', 'Đường đi bị chắn. Chọn đích khác.'],
  ['Choose a different destination within 8 world units.', 'Chọn đích khác trong phạm vi 8 đơn vị.'],
  ['The facility no longer holds this quantity.', 'Kho đệm không còn đủ số lượng này.'],
  ['This item cannot be stored in an industrial buffer.', 'Vật phẩm này không thể chứa trong kho đệm công nghiệp.'],
  ['Your bag is too heavy. Store some supplies first.', 'Túi quá nặng. Cất bớt vật liệu trước.'],
  ['Your bag is full. Store some supplies first.', 'Túi đã đầy. Cất bớt vật liệu trước.'],
  ['Gather the missing materials first.', 'Thu thập đủ vật liệu trước.'], ['The colony changed. Try the action again.', 'Thuộc địa đã thay đổi. Thử lại thao tác.'],
  ['Your bag changed. Try the action again.', 'Túi đã thay đổi. Thử lại thao tác.'],
  ['Choose explored, dry, unobstructed ground nearby.', 'Chọn đất khô, đã khám phá và không bị chắn ở gần.'],
  ['Choose ground clear of other structures.', 'Chọn đất trống, không chồng công trình.'],
  ['Charge the rover inside a powered network first.', 'Sạc xe trong mạng có điện trước.'],
  ['The rover route is obstructed. Choose another destination.', 'Đường xe bị chắn. Chọn đích khác.'],
  ['Disconnect this rover’s conveyors before driving.', 'Ngắt băng chuyền nối với xe trước khi lái.'],
  ['Unload this facility’s material buffer before dismantling.', 'Lấy hết vật liệu trong kho đệm trước khi tháo dỡ.'],
  ['Disconnect this facility’s conveyors before dismantling.', 'Ngắt băng chuyền trước khi tháo dỡ.'],
  ['Complete the required industry and colony research first.', 'Hoàn thành nghiên cứu công nghiệp và thuộc địa cần thiết trước.'],
] as const;
export const industryMessages: MessageDictionary = {
  en: Object.fromEntries(rows.map(([en]) => [en, en])),
  vi: Object.fromEntries(rows),
};

/** Only source-authored presentation strings; never applied to player names, chat or IDs. */
export function industryText(source: string): string {
  if (locale() === 'en') return source;
  const exact = industryMessages.vi[source];
  if (exact) return exact;
  const templates: readonly [RegExp, (...values: string[]) => string][] = [
    [/^Offsets are world units from your current position\. Build within (.+) units, on explored dry ground clear of obstacles\.$/, range => `Độ lệch tính từ vị trí hiện tại. Xây trong phạm vi ${range} đơn vị, trên đất khô đã khám phá và không bị chắn.`],
    [/^Move within (.+) world units to manage this facility\. You are (.+) units away\.$/, (range, away) => `Đến trong phạm vi ${range} đơn vị để quản lý. Bạn đang cách ${away} đơn vị.`],
    [/^Battery (.+)% · charges near powered infrastructure\. Driving uses battery and adds wear\.$/, percent => `Pin ${percent}% · sạc gần công trình có điện. Lái xe tiêu hao pin và làm xe hao mòn.`],
    [/^Choose an explored destination within (.+) units of the rover\. Routes are checked for ground and obstacles\.$/, range => `Chọn đích đã khám phá trong phạm vi ${range} đơn vị tính từ xe. Đường đi được kiểm tra địa hình và vật cản.`],
    [/^Links move actual buffer stock between facilities during active simulation\. Endpoints must be within (.+) units\. Pause or repair damaged facilities to control the chain\.$/, range => `Băng chuyền chuyển vật liệu thật giữa kho đệm khi mô phỏng hoạt động. Hai đầu cách nhau tối đa ${range} đơn vị. Tạm dừng hoặc sửa máy để quản lý dây chuyền.`],
    [/^Research belongs to this colony and is shared with other colonists\. Costs come from your bag\. Research within (.+) world units of the Landing Lab\.$/, range => `Nghiên cứu thuộc về cả thuộc địa. Chi phí lấy từ túi của bạn. Nghiên cứu trong phạm vi ${range} đơn vị quanh phòng thí nghiệm hạ cánh.`],
  ];
  for (const [pattern, render] of templates) { const match = pattern.exec(source); if (match) return render(...match.slice(1)); }
  for (const [prefix, translated] of [['Build ', 'Xây '], ['Research ', 'Nghiên cứu '], ['Requires: ', 'Cần: '], ['Colony prerequisite: ', 'Nghiên cứu thuộc địa: '], ['Input: ', 'Nguyên liệu: '], ['Your position: ', 'Vị trí của bạn: '], ['Position ', 'Vị trí '], ['Repair ', 'Sửa ']] as const) {
    if (source.startsWith(prefix)) return translated + industryText(source.slice(prefix.length));
  }
  if (/^(Load|Take) \d+$/.test(source)) return source.replace(/^Load/, 'Nạp').replace(/^Take/, 'Lấy');
  if (/^completed cycles \d+$/.test(source)) return source.replace('completed cycles', 'chu kỳ hoàn tất');
  if (/^\d+ consumers$/.test(source)) return source.replace('consumers', 'máy dùng điện');
  if (/^\d+ relays$/.test(source)) return source.replace('relays', 'trạm tiếp điện');
  if (/^\d+\/\d+ power$/.test(source)) return source.replace('power', 'điện');
  if (source.endsWith(' researched.')) return industryText(source.slice(0, -12)) + ' đã được nghiên cứu.';
  if (source.includes(' · ')) return source.split(' · ').map(industryText).join(' · ');
  if (source.includes(' → ')) return source.split(' → ').map(industryText).join(' → ');
  if (source.includes(' + ')) return source.split(' + ').map(industryText).join(' + ');
  const namedCount = /^(.+) (\d+\/\d+)$/.exec(source);
  if (namedCount) return industryText(namedCount[1]!) + ' ' + namedCount[2];
  const cycle = /^(\d+\/\d+) s · completed cycles (\d+)$/.exec(source);
  if (cycle) return cycle[1] + ' giây · chu kỳ hoàn tất ' + cycle[2];
  const quantity = /^(\d+) (.+)$/.exec(source);
  if (quantity) return quantity[1] + ' ' + industryText(quantity[2]!);
  const counter = /^(buffer|bag|condition|Battery|active time) (.+)$/.exec(source);
  if (counter) return ({ buffer: 'kho đệm', bag: 'túi', condition: 'độ bền', Battery: 'Pin', 'active time': 'thời gian hoạt động' } as Record<string, string>)[counter[1]!] + ' ' + counter[2];
  return uiPhrase(source);
}
