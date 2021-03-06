$(document).ready(function() {
	$('#edit-div').hide();
	// change list to input forms when edit button clicked
	$('#edit-btn').on('click', function() {
		if ($('.input-edit').is('[readonly]')) {
			$('.input-edit').prop('readonly', false); // turns readonlsy off
			$('.input-edit[type="text"]').css({'border': '1px solid white'}); // change styling to show editable
			$('.input-edit[type="password"]').css({'border': '1px solid white'});
			$('#edit-div').show();
		}
		else {
			$('.input-edit').prop('readonly', true); // make readonly
			$('.input-edit[type="text"]').css({'border': 'none'}); // turn off borders when read only
			$('.input-edit[type="password"]').css({'border': 'none'});
			$('#edit-div').hide();
		}
	});

	// disable edit box if not all inputs are provided
	$('form').find('input').keyup(function() {

        var empty = false;
        $('form').find('input').each(function() {
            if ($(this).val() == '' && $(this).attr('type') != "password") {
            	console.log($(this).attr('type'));
                empty = true;
            }
        });

        if (empty) {
            $('#edit').attr('disabled', 'disabled'); 
        } else {
            $('#edit').removeAttr('disabled'); 
        }
	});

});